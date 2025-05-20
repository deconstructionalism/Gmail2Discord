# Count Tickets Google Cloud Function

This function can be run as a Google Cloud Function to get all emails
from a Gmail label that aggregates Zeffy tickets sales emails and count
the number of tickets sold, and then send the results to a Discord
channel via a webhook.

## Prerequisites

### Local

- [Node.js](https://nodejs.org/en/)

### Google Cloud Platform

- [Google Cloud Platform Account](https://cloud.google.com/)
- [A Project within the Google Cloud Platform Account](https://developers.google.com/workspace/guides/create-project)
- Credentials for the project with access to the Gmail API (use the
  [get-credentials](../get-credentials) script)

### Gmail

- A Gmail account with a filter label that aggregates Zeffy sales emails

### Discord

- [A Discord Webhook URL to send the results to a Discord channel](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)

## Setup (Local)

1. Clone this repo
2. Install the required packages:

    ```bash
    npm install
    ```

3. Copy `.env.example` to `.env` and fill in the required values:

    ```text
    GCLOUD_FUNCTION_NAME=<your google cloud function name>
    GMAIL_LABEL_NAME=<your gmail label name containing Zeffy sales emails>
    GCLOUD_OAUTH2_TOKEN=<the token from the get-credentials script>
    DISCORD_WEBHOOK_URL=<your discord webhook url>
    STARTING_COUNT_OFFSET=<number of tickets sold that were not tracked by emails>
    TICKET_EVENT_NAME=<event name to apply to discord posts>

    ```

## Usage (Local)

1. Run the cloud function locally:

    ```bash
    npm run start
    ```

2. To trigger a mock cloud event, run the following command:

    ```bash
    npm run trigger-mock-event
    ```

> The mock event will still read real data from the Gmail label
> and send the results to the Discord webhook.

## Setup (Google Cloud)

1. [Set up push notifications for Gmail](https://developers.google.com/gmail/api/guides/push)
   for the Gmail label containing Zeffy sales emails`
2. On Google Cloud console, [follow the  steps under **Before your begin** here](https://cloud.google.com/run/docs/quickstarts/functions/deploy-functions-console)
3. To to deploy this project as a Google Cloud Run function, run:

    ```bash
    npm run deploy
    ```
