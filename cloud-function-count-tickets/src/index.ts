import env from "env-var";
import { setupGmailClient } from "./lib/gmailClient";
import { cloudEvent } from "@google-cloud/functions-framework";
import { IGmailMessageWithContents } from "./types";
import parseMessage from "./lib/parseMessage";
import getMessageContents from "./lib/getMessageContents";
import DiscordWebhookClient from "./lib/discordWebhookClient";
import splitErrorsFromSales from "./lib/splitErrorsFromSales";

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
  const totalSold = sales.reduce((acc, sale) => acc + sale.ticketCount, 0);

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
    await discordClient.reportNewSales(totalSold, sales[0]);
    console.log("Reported new sales to Discord");
    console.log({ totalSold, latestSale: sales[0] });
  } catch (error) {
    console.error("Error reporting sales to Discord");
    console.error(error);
  }
});
