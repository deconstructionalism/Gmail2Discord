import { google, Auth, gmail_v1 } from "googleapis";

export interface IWatchResult {
  label: string;
  topic: string;
  historyId: string | null | undefined;
  expiration: string;
}

/**
 * Build an authorized Gmail client from OAuth credentials.
 * @param credentials - The OAUTH2 token credentials object to authenticate
 *                      with the Gmail API
 * @returns - An authorized Gmail API client
 */
export const buildGmailClient = async (
  credentials: Auth.JWTInput,
): Promise<gmail_v1.Gmail> => {
  const authClient = google.auth.fromJSON(credentials);
  const auth = await google.auth.getClient({ authClient });

  return google.gmail({ version: "v1", auth });
};

/**
 * Look up a Gmail label ID by name.
 *
 * If no label is found with the provided name, an error is thrown.
 * @param gmail - An authorized Gmail API client
 * @param labelName - The name of the Gmail label to look up
 * @returns - The ID of the matched Gmail label
 */
export const getGmailLabelId = async (
  gmail: gmail_v1.Gmail,
  labelName: string,
): Promise<string> => {
  const labels = await gmail.users.labels.list({ userId: "me" });
  const label = labels.data.labels?.find((l) => l.name === labelName);

  if (!label?.id) {
    throw new Error(`Label not found: ${labelName}`);
  }

  return label.id;
};

/**
 * Register (or refresh) a Gmail push notification watch on a label so that
 * Gmail publishes notifications to the given Pub/Sub topic when messages
 * matching the label arrive.
 *
 * This call is idempotent — Gmail allows only one active watch per user, so
 * a subsequent call replaces the existing watch and returns a fresh
 * expiration. Gmail watches expire after at most 7 days, so this must be
 * called periodically to keep notifications flowing.
 * @param credentials - The OAUTH2 token credentials object to authenticate
 *                      with the Gmail API
 * @param labelName - The name of the Gmail label whose changes should trigger
 *                    notifications
 * @param topicName - The fully-qualified Pub/Sub topic name in the form
 *                    `projects/<project-id>/topics/<topic>` that Gmail will
 *                    publish notifications to
 * @returns - A summary of the registered watch including its expiration
 */
export const registerWatch = async (
  credentials: Auth.JWTInput,
  labelName: string,
  topicName: string,
): Promise<IWatchResult> => {
  const gmail = await buildGmailClient(credentials);
  const labelId = await getGmailLabelId(gmail, labelName);

  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName,
      labelIds: [labelId],
      labelFilterBehavior: "INCLUDE",
    },
  });

  return {
    label: `${labelName} (${labelId})`,
    topic: topicName,
    historyId: res.data.historyId,
    expiration: res.data.expiration
      ? new Date(parseInt(res.data.expiration)).toISOString()
      : "unknown",
  };
};
