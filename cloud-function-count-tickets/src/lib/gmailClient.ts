import { google, Auth, gmail_v1 } from "googleapis";

class GmailClient {
  client: gmail_v1.Gmail;
  credentials: Auth.JWTInput;

  /**
   * Creates a new GmailClient instance.
   * @param credentials - The OAUTH2 token credentials object
   *                      to authenticate with the Gmail API
   */
  constructor(credentials: Auth.JWTInput) {
    this.credentials = credentials;
    this.client = google.gmail({ version: "v1" });
  }

  /**
   * Authorizes the GmailClient instance with the provided credentials.
   *
   * This method must be called before any other GmailClient methods.
   */
  authorize = async () => {
    const authClient = google.auth.fromJSON(this.credentials);
    const client = await google.auth.getClient({ authClient });
    this.client = google.gmail({ version: "v1", auth: client });
  };

  /**
   * Retrieves the ID of a Gmail label by its name.
   *
   * If no label is found with the provided name, an error is thrown.
   * @param labelName - The name of the Gmail label to retrieve the ID for
   * @returns - The ID of the Gmail label
   */
  getLabelIdByName = async (labelName: string): Promise<string> => {
    try {
      // Retrieve a list of all Gmail labels
      const res = await this.client.users.labels.list({
        userId: "me",
      });

      // Find the label with the provided
      const label = res.data.labels?.find(({ name }) => name === labelName);

      // If no label is found, throw an error
      if (!label?.id)
        throw new Error(`No Gmail label found with name '${labelName}'`);

      return label.id;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Private helper method to retrieve a page of Gmail messages for a given label ID
   * @param pageToken - The page token to retrieve the next page of messages.
   * @param labelId - The ID of the Gmail label to retrieve messages for
   * @returns - A list of Gmail messages and the next page token
   */
  #getMessagesForLabelIdPage = async (
    pageToken: gmail_v1.Schema$ListMessagesResponse["nextPageToken"],
    labelId: string
  ): Promise<{
    messages: gmail_v1.Schema$ListMessagesResponse["messages"];
    nextPageToken: gmail_v1.Schema$ListMessagesResponse["nextPageToken"];
  }> => {
    const res = await this.client.users.messages.list({
      userId: "me",
      labelIds: [labelId],
      pageToken: pageToken === null ? undefined : pageToken,
    });

    return {
      messages: res.data.messages,
      nextPageToken: res.data.nextPageToken,
    };
  };

  /**
   * Retrieves a list of Gmail messages for a given label ID.
   *
   * If no messages are found for the provided label ID, an error is thrown.
   * @param labelId - The ID of the Gmail label to retrieve messages for
   * @returns - A list of Gmail messages
   */
  getMessagesForLabelId = async (
    labelId: string
  ): Promise<gmail_v1.Schema$Message[]> => {
    try {
      let allMessages: gmail_v1.Schema$Message[] = [];
      let pageToken: string | null | undefined = null;

      // Retrieve all pages of messages for the label
      while (pageToken !== undefined) {
        const { messages = [], nextPageToken } =
          await this.#getMessagesForLabelIdPage(pageToken, labelId);
        pageToken = nextPageToken;
        allMessages.push(...messages);
      }

      // If no messages are found, throw an error
      if (!allMessages) throw new Error("No messages found for label ID");

      return allMessages;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Retrieves the full Gmail message by its ID.
   * @param messageId - The ID of the Gmail message to retrieve
   * @returns - The full Gmail message object
   */
  getMessageFullFormat = async (
    messageId: gmail_v1.Schema$Message["id"]
  ): Promise<gmail_v1.Schema$Message> => {
    try {
      // Ensure a message ID is provided
      if (!messageId) throw new Error("No message ID provided");

      // Retrieve the full message object
      const res = await this.client.users.messages.get({
        format: "full",
        userId: "me",
        id: messageId,
      });

      return res.data;
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Helper function to instantiate and authorize a GmailClient instance
 * with the provided credentials.
 * @param TOKEN - The OAUTH2 token credentials object to authenticate
 *                with the Gmail API
 * @returns - An authorized GmailClient instance
 */
const setupGmailClient = async (TOKEN: Auth.JWTInput): Promise<GmailClient> => {
  const client = new GmailClient(TOKEN);
  await client.authorize();
  return client;
};

export { setupGmailClient };

export default GmailClient;
