import { gmail_v1 } from "googleapis";

export interface IGmailMessageWithContents extends gmail_v1.Schema$Message {
  contents: string;
}

export interface IParsedMessageData {
  messagedId?: string | null;
  name: string;
  location: string;
  ticketCount?: number;
  date?: Date;
  errors?: string[];
}

export interface IParsedMessageDataWithErrors extends IParsedMessageData {
  errors?: string[];
}

export interface IParsedMessageDataWithoutErrors extends IParsedMessageData {
  messagedId: string;
  ticketCount: number;
  date: Date;
  errors: undefined;
}
