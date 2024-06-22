import { IGmailMessageWithContents, IParsedMessageData } from "../types";

// Regular expression to split the email content
const SPLIT_START_REGEX = /####FX4F 2024/;
const TICKET_REGEX = /^Participant\s\d+:/gm;

/**
 * Parses the email message to extract the required data.
 *
 * If errors are found, they are returned in the result under the
 * `errors` key.
 * @param message - The email message to parse
 * @returns - The parsed email message data
 */
const parseMessage = (
  message: IGmailMessageWithContents
): IParsedMessageData => {
  // Extract the ticket count from the email
  const ticketMatches = message.contents.match(TICKET_REGEX);

  // Extract the name and location from the email
  const text = message.contents.split(SPLIT_START_REGEX)[1];
  const lines = text.split("\r\n");
  const name = lines[6].replace(/\*\*/g, "").trim();
  const location = lines[10].trim();

  // Check for errors
  const errors = [];

  if (!message?.id) {
    errors.push("Could not find email id");
  }

  if (!message?.internalDate) {
    errors.push("Could not find email date");
  }

  if (name.length === 0) {
    errors.push("Could not find buyer name in email");
  }

  if (location.length === 0) {
    errors.push("Could not find buyer location in email");
  }

  if (!ticketMatches?.length) {
    errors.push("Could not find ticket count in email");
  }

  // Return the parsed message data
  const result = {
    messagedId: message.id,
    name: name,
    location: location,
    ticketCount: ticketMatches?.length,
    date: message.internalDate
      ? new Date(parseInt(message.internalDate))
      : undefined,
  };

  return errors.length > 0 ? { ...result, errors } : result;
};

export default parseMessage;
