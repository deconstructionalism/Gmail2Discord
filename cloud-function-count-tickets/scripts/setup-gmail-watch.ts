import "dotenv/config";
import env from "env-var";
import { registerWatch } from "../src/lib/gmailWatch";

// Get env values
const PROJECT_ID = env.get("GCLOUD_PROJECT_ID").required().asString();
const PUBSUB_TOPIC_NAME = env
  .get("GCLOUD_PUBSUB_TOPIC_NAME")
  .required()
  .asString();
const GMAIL_LABEL_NAME = env.get("GMAIL_LABEL_NAME").required().asString();
const TOKEN = env.get("GCLOUD_OAUTH2_TOKEN").required().asJsonObject();
const TOPIC_NAME = `projects/${PROJECT_ID}/topics/${PUBSUB_TOPIC_NAME}`;

/**
 * Set up gmail watch on label of choice to push notifications that
 * can be consumed by Cloud Function Count Tickets.
 */
const setupGmailWatch = async (): Promise<void> => {
  const result = await registerWatch(TOKEN, GMAIL_LABEL_NAME, TOPIC_NAME);

  console.log("Gmail watch registered:");
  console.log(JSON.stringify(result, null, 2));
};

// Run the script
setupGmailWatch().catch((err) => {
  console.error(err);
  process.exit(1);
});
