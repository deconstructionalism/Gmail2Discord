import env from "env-var";
import { setupGmailClient } from "./lib/gmailClient";
import { cloudEvent, http } from "@google-cloud/functions-framework";
import { IGmailMessageWithContents } from "./types";
import parseMessage from "./lib/parseMessage";
import getMessageContents from "./lib/getMessageContents";
import DiscordWebhookClient from "./lib/discordWebhookClient";
import splitErrorsFromSales from "./lib/splitErrorsFromSales";
import handleRenewGmailWatch from "./lib/renewGmailWatch";

// Load environment variables
require("dotenv").config();
const GCLOUD_FUNCTION_NAME = env
  .get("GCLOUD_FUNCTION_NAME")
  .required()
  .asString();
const GMAIL_LABEL_NAME = env.get("GMAIL_LABEL_NAME").required().asString();
const TOKEN = env.get("GCLOUD_OAUTH2_TOKEN").required().asJsonObject();
const DISCORD_WEBHOOK_URL = env
  .get("DISCORD_WEBHOOK_URL")
  .required()
  .asString();
const STARTING_COUNT_OFFSET = env
  .get("STARTING_COUNT_OFFSET")
  .default("0")
  .asInt();
const TICKET_EVENT_NAME = env
  .get("TICKET_EVENT_NAME")
  .required()
  .asString();

// Renewal-only env vars. Read but not required at module load so this file
// can be deployed as the parseAndPushToDiscord function without the renewal
// config being present. The renewGmailWatch handler validates them itself.
const GCLOUD_PROJECT_ID = env.get("GCLOUD_PROJECT_ID").asString();
const GCLOUD_PUBSUB_TOPIC_NAME = env.get("GCLOUD_PUBSUB_TOPIC_NAME").asString();
const WATCH_RENEWAL_START_DATE = env
  .get("WATCH_RENEWAL_START_DATE")
  .asString();
const WATCH_RENEWAL_END_DATE = env.get("WATCH_RENEWAL_END_DATE").asString();

cloudEvent(GCLOUD_FUNCTION_NAME, async () => {
  // Setup the Gmail client
  const gmailClient = await setupGmailClient(TOKEN);

  // Get all messages for the specified label
  const labelId = await gmailClient.getLabelIdByName(GMAIL_LABEL_NAME);
  const messages = await gmailClient.getMessagesForLabelId(labelId);
  const messageIds = messages.map(({ id }) => id);

  // Retrieve the full message contents
  const fullMessages = await Promise.all(
    messageIds.map(gmailClient.getMessageFullFormat)
  );
  const messageContents = fullMessages.map((message) => ({
    ...message,
    contents: getMessageContents(message),
  })) satisfies IGmailMessageWithContents[];

  // Parse the message contents into sales data
  const results = messageContents.map(parseMessage);

  // Split the results into sales and errors
  const { errors, sales } = splitErrorsFromSales(results);

  // Calculate the total number of tickets sold
  const totalSold =
    sales.reduce((acc, sale) => acc + sale.ticketCount, 0) +
    STARTING_COUNT_OFFSET;

  // Log any errors during parsing
  errors.forEach((error) => {
    console.log(`Error parsing message: ${error.messagedId}`);
    console.error(error);
  });

  // Report the new sales to Discord
  if (sales.length === 0) {
    console.log("No new sales found");
    return;
  }

  try {
    const discordClient = new DiscordWebhookClient(DISCORD_WEBHOOK_URL);
    await discordClient.reportNewSales(totalSold, TICKET_EVENT_NAME, sales[0]);
    console.log("Reported new sales to Discord");
    console.log({ totalSold, latestSale: sales[0] });
  } catch (error) {
    console.error("Error reporting sales to Discord");
    console.error(error);
  }
});

http("renewGmailWatch", (req, res) => {
  // Validate renewal-only env vars at invocation time so the count-tickets
  // function can be deployed without them.
  if (
    !GCLOUD_PROJECT_ID ||
    !GCLOUD_PUBSUB_TOPIC_NAME ||
    !WATCH_RENEWAL_START_DATE ||
    !WATCH_RENEWAL_END_DATE
  ) {
    const missing = [
      ["GCLOUD_PROJECT_ID", GCLOUD_PROJECT_ID],
      ["GCLOUD_PUBSUB_TOPIC_NAME", GCLOUD_PUBSUB_TOPIC_NAME],
      ["WATCH_RENEWAL_START_DATE", WATCH_RENEWAL_START_DATE],
      ["WATCH_RENEWAL_END_DATE", WATCH_RENEWAL_END_DATE],
    ]
      .filter(([, v]) => !v)
      .map(([k]) => k);
    const message = `Renewal env vars not configured: ${missing.join(", ")}`;
    console.error(message);
    res.status(500).json({ error: message });
    return;
  }

  return handleRenewGmailWatch(
    {
      credentials: TOKEN,
      labelName: GMAIL_LABEL_NAME,
      topicName: `projects/${GCLOUD_PROJECT_ID}/topics/${GCLOUD_PUBSUB_TOPIC_NAME}`,
      startDate: WATCH_RENEWAL_START_DATE,
      endDate: WATCH_RENEWAL_END_DATE,
    },
    req,
    res,
  );
});
