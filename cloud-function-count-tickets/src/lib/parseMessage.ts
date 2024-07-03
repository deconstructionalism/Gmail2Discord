import { IGmailMessageWithContents, IParsedMessageData } from "../types";

// Regular expression to search the email content
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

  // Check for errors
  const errors = [];

  if (!message?.id) {
    errors.push("Could not find email id");
  }

  if (!message?.internalDate) {
    errors.push("Could not find email date");
  }

  if (!ticketMatches?.length) {
    errors.push("Could not find ticket count in email");
  }

  // Return the parsed message data
  const result = {
    messagedId: message.id,
    ticketCount: ticketMatches?.length,
    date: message.internalDate
      ? new Date(parseInt(message.internalDate))
      : undefined,
  };

  return errors.length > 0 ? { ...result, errors } : result;
};

export default parseMessage;
