# Count Tickets Google Cloud Function

This function can be run as a Google Cloud Function to get all emails
from a Gmail label that aggregates Zeffy tickets sales emails and count
the number of tickets sold, and then send the results to a Discord
channel via a webhook.

## Architecture

This project deploys two Cloud Functions from the same source:

- **`parseAndPushToDiscord`** — Pub/Sub-triggered. Subscribes to a topic
  that Gmail publishes notifications to whenever messages land in the
  configured label. On each invocation, it lists messages in the label,
  parses ticket counts, and posts the latest sale to Discord.
- **`renewGmailWatch`** — HTTP-triggered. Invoked daily by Cloud
  Scheduler to refresh the Gmail push notification watch (Gmail watches
  expire after at most 7 days, so they must be renewed periodically).
  The handler no-ops outside the configured date window, so the
  scheduled job can be left in place year-round and only renew during
  the active ticket-sales season.

```
                          ┌──────────────────┐
   Cloud Scheduler ──────►│ renewGmailWatch  │──► Gmail (users.watch)
   (daily, OIDC HTTP)     └──────────────────┘
                                                       │
                                                       ▼
   Gmail (label change) ──► Pub/Sub topic ──► parseAndPushToDiscord ──► Discord
```

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
    GCLOUD_PROJECT_ID=<your google cloud project id>
    GCLOUD_FUNCTION_NAME=<your google cloud function name>
    GCLOUD_PUBSUB_TOPIC_NAME=<pub/sub topic Gmail will publish to>
    GMAIL_LABEL_NAME=<your gmail label name containing Zeffy sales emails>
    GCLOUD_OAUTH2_TOKEN=<the token from the get-credentials script>
    DISCORD_WEBHOOK_URL=<your discord webhook url>
    STARTING_COUNT_OFFSET=<number of tickets sold that were not tracked by emails>
    TICKET_EVENT_NAME=<event name to apply to discord posts>
    WATCH_RENEWAL_START_DATE=<YYYY-MM-DD, first date the watch should auto-renew>
    WATCH_RENEWAL_END_DATE=<YYYY-MM-DD, last date the watch should auto-renew>

    ```

    > `WATCH_RENEWAL_START_DATE` and `WATCH_RENEWAL_END_DATE` bound the
    > active season for the `renewGmailWatch` function. Outside this
    > window the scheduled renewal becomes a no-op, so Gmail
    > notifications naturally stop flowing once the watch expires after
    > the end date.

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

1. On Google Cloud console, [follow the steps under **Before you begin** here](https://cloud.google.com/run/docs/quickstarts/functions/deploy-functions-console).
2. Create the Pub/Sub topic that Gmail will publish notifications to (name
   must match `GCLOUD_PUBSUB_TOPIC_NAME` in your `.env`):

    ```bash
    gcloud pubsub topics create "$GCLOUD_PUBSUB_TOPIC_NAME"
    ```

3. Grant the Gmail push service account permission to publish to that topic
   (see the [Gmail push notifications guide](https://developers.google.com/gmail/api/guides/push)
   for details):

    ```bash
    gcloud pubsub topics add-iam-policy-binding "$GCLOUD_PUBSUB_TOPIC_NAME" \
      --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
      --role=roles/pubsub.publisher
    ```

4. Deploy this project as a Google Cloud Run function (it will subscribe to
   the topic above):

    ```bash
    npm run deploy
    ```

5. Grant the function's runtime service account permission to invoke the
   underlying Cloud Run service. Without this, Pub/Sub deliveries from the
   topic will fail with `lacks {run.routes.invoke} permission` and the
   function will never execute. Use the default compute service account
   (`<PROJECT_NUMBER>-compute@developer.gserviceaccount.com`) unless you
   deployed with a custom one:

    ```bash
    PROJECT_NUMBER=$(gcloud projects describe "$GCLOUD_PROJECT_ID" --format='value(projectNumber)')
    gcloud run services add-iam-policy-binding "$(echo "$GCLOUD_FUNCTION_NAME" | tr '[:upper:]' '[:lower:]')" \
      --region=us-east1 \
      --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
      --role=roles/run.invoker
    ```

6. Register a Gmail watch so Gmail publishes notifications to the topic when
   messages land in the configured label:

    ```bash
    npm run watch:setup
    ```

   > ⚠️ **Gmail watches expire after 7 days max.** The remaining steps
   > set up an automated renewal so you don't have to re-run this
   > script manually. If you skip those steps, you must re-run
   > `npm run watch:setup` before the printed `expiration` timestamp
   > passes or notifications will stop flowing.

7. Deploy the renewal function as a separate HTTP-triggered Cloud
   Function (same source, different entry point):

    ```bash
    npm run deploy:renew
    ```

8. Create the Cloud Scheduler job that hits the renewal function daily
   with an OIDC token, and grant its service account permission to
   invoke the function. The script is idempotent — re-run it after
   changing the schedule or region:

    ```bash
    npm run scheduler:setup
    ```

   The job fires at 12:00 UTC every day. Inside the
   `WATCH_RENEWAL_START_DATE` → `WATCH_RENEWAL_END_DATE` window the
   function re-registers the watch; outside the window it logs and
   returns 200 without calling Gmail. You can edit the schedule, time
   zone, or region by changing the tunables at the top of
   [`scripts/setup-cloud-scheduler.sh`](scripts/setup-cloud-scheduler.sh)
   and re-running the npm script.
