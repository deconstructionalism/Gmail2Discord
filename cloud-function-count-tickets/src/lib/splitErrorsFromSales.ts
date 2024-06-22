import {
  IParsedMessageData,
  IParsedMessageDataWithErrors,
  IParsedMessageDataWithoutErrors,
} from "../types";

// TYPE GUARDS

/**
 * Type guard to check if the parsed message data has errors.
 * @param parsedMessage - The parsed message data to check
 */
const parsedMessageDataHasErrors = (
  parsedMessage: IParsedMessageData
): parsedMessage is IParsedMessageDataWithErrors => {
  return parsedMessage.errors !== undefined;
};

/**
 * Type guard to check if the parsed message data has no errors.
 * @param parsedMessage - The parsed message data to check
 */
const parsedMessageDataHasNoErrors = (
  parsedMessage: IParsedMessageData
): parsedMessage is IParsedMessageDataWithoutErrors => {
  return (
    parsedMessage.errors === undefined &&
    parsedMessage.messagedId !== undefined &&
    parsedMessage.ticketCount !== undefined &&
    parsedMessage.date !== undefined
  );
};

// TYPES

interface ISplitErrorsFromSales {
  errors: IParsedMessageDataWithErrors[];
  sales: IParsedMessageDataWithoutErrors[];
}

/**
 * Splits the parsed message data into two arrays: one for sales data
 * and one for errors.
 * @param data - The parsed message data to split
 * @returns - An object containing the split data
 */
const splitErrorsFromSales = (
  data: IParsedMessageData[]
): ISplitErrorsFromSales => {
  return data.reduce<ISplitErrorsFromSales>(
    (acc, result) => {
      // Check if the parsed message data has errors
      if (parsedMessageDataHasErrors(result)) {
        return { ...acc, errors: [...acc.errors, result] };

        // Check if the parsed message data has no errors
      } else if (parsedMessageDataHasNoErrors(result)) {
        return { ...acc, sales: [...acc.sales, result] };

        // If the parsed message data has neither errors
        // nor sales data, return the accumulator. This should
        // never happen, but is included for completeness.
      } else {
        return acc;
      }
    },
    { errors: [], sales: [] }
  );
};

export default splitErrorsFromSales;
