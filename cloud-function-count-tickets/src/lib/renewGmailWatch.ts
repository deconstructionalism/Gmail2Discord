import { Auth } from "googleapis";
import { Request, Response } from "@google-cloud/functions-framework";
import { registerWatch } from "./gmailWatch";

export interface IRenewGmailWatchOptions {
  credentials: Auth.JWTInput;
  labelName: string;
  topicName: string;
  startDate: string;
  endDate: string;
}

/**
 * Parse a `YYYY-MM-DD` string into a UTC `Date` at midnight.
 *
 * If the input is not a valid ISO date string, an error is thrown.
 * @param iso - The ISO date string to parse (e.g. `2026-05-25`)
 * @returns - The parsed UTC `Date` at midnight on the given day
 */
const parseIsoDate = (iso: string): Date => {
  const date = new Date(`${iso}T00:00:00Z`);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return date;
};

/**
 * Check whether today's UTC date falls within a given window.
 *
 * The window is inclusive of both endpoints. Dates are compared in UTC so
 * the scheduled cadence (driven by Cloud Scheduler in UTC) is consistent
 * regardless of the deployer's timezone.
 * @param startDate - The start of the window as a `YYYY-MM-DD` string
 * @param endDate - The end of the window as a `YYYY-MM-DD` string
 * @returns - `true` if today's UTC date is on or between `startDate` and
 *            `endDate`
 */
const isWithinDateWindow = (startDate: string, endDate: string): boolean => {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  return today >= start && today <= end;
};

/**
 * HTTP handler that refreshes the Gmail push notification watch on the
 * configured label so that notifications continue past the 7-day Gmail
 * watch expiry.
 *
 * Designed to be invoked daily by Cloud Scheduler. The handler no-ops with
 * a 200 response if today's UTC date is outside the configured renewal
 * window, so the same scheduled job can be left in place year-round and
 * only renew during the active ticket-sales season.
 * @param options - Renewal configuration including credentials, label,
 *                  topic, and the date window in which renewal is active
 * @param _req - The incoming HTTP request (unused)
 * @param res - The HTTP response used to report renewal status
 */
const handleRenewGmailWatch = async (
  options: IRenewGmailWatchOptions,
  _req: Request,
  res: Response,
): Promise<void> => {
  const { credentials, labelName, topicName, startDate, endDate } = options;

  try {
    if (!isWithinDateWindow(startDate, endDate)) {
      const message = `Outside renewal window (${startDate} → ${endDate}); skipping`;
      console.log(message);
      res.status(200).json({ skipped: true, message });
      return;
    }

    const result = await registerWatch(credentials, labelName, topicName);
    console.log("Gmail watch renewed:");
    console.log(JSON.stringify(result, null, 2));
    res.status(200).json({ skipped: false, ...result });
  } catch (error) {
    console.error("Error renewing Gmail watch");
    console.error(error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : String(error) });
  }
};

export default handleRenewGmailWatch;
