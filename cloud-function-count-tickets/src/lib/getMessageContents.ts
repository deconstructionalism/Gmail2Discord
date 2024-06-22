import { gmail_v1 } from "googleapis";

/**
 * Converts a Gmail message object into a string of its contents.
 * @param message - The Gmail message object to convert
 * @returns - The contents of the Gmail message
 */
const getMessageContents = (
  message: gmail_v1.Schema$Message
): string  => {
  const payload = message.payload;

  // If the message has no payload, return an empty string
  if (!payload) return "";

  // Recursively extract the contents of the message and
  // concatenate them into a single string
  const recursePayload = (payload: gmail_v1.Schema$MessagePart): string => {
    if (payload.parts) {
      return payload.parts.map(recursePayload).join("");
    } else if (payload.body?.data) {
      return Buffer.from(payload.body.data, "base64").toString();
    } else {
      return "";
    }
  };

  return recursePayload(payload);
};

export default getMessageContents;