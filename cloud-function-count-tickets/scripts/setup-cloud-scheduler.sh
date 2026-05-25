#!/bin/bash
# Idempotently create (or update) a Cloud Scheduler job that invokes the
# renewGmailWatch Cloud Function daily with an OIDC token, and grant the
# scheduler's service account permission to invoke the function.
#
# Re-running this script after a config change updates the job in place.

set -euo pipefail

# Load env vars from .env
if [ ! -f ".env" ]; then
  echo "Error: .env not found. Run from the project root."
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a

# Required env vars
: "${GCLOUD_PROJECT_ID:?GCLOUD_PROJECT_ID must be set in .env}"

# Enable the Cloud Scheduler API if it isn't already (no-op on subsequent runs)
echo "Ensuring Cloud Scheduler API is enabled..."
gcloud services enable cloudscheduler.googleapis.com >/dev/null

# Tunables — change here if you want a different cadence or region
REGION="us-east1"
RENEW_FUNCTION_NAME="renewGmailWatch"
JOB_NAME="renew-gmail-watch"
SCHEDULE="0 12 * * *"
TIME_ZONE="Etc/UTC"

# Derive identifiers
PROJECT_NUMBER=$(gcloud projects describe "$GCLOUD_PROJECT_ID" \
  --format='value(projectNumber)')
INVOKER_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
RENEW_RUN_SERVICE=$(echo "$RENEW_FUNCTION_NAME" | tr '[:upper:]' '[:lower:]')

# Look up the deployed renewal function's HTTPS endpoint
echo "Looking up $RENEW_FUNCTION_NAME function URL..."
RENEW_URL=$(gcloud functions describe "$RENEW_FUNCTION_NAME" \
  --region="$REGION" --gen2 --format='value(serviceConfig.uri)' 2>/dev/null || true)

if [ -z "$RENEW_URL" ]; then
  echo "Error: $RENEW_FUNCTION_NAME is not deployed. Run 'npm run deploy:renew' first."
  exit 1
fi
echo "   → $RENEW_URL"

# Grant the scheduler's service account run.invoker on the renewal function
echo "Granting roles/run.invoker on $RENEW_RUN_SERVICE to $INVOKER_SA..."
gcloud run services add-iam-policy-binding "$RENEW_RUN_SERVICE" \
  --region="$REGION" \
  --member="serviceAccount:${INVOKER_SA}" \
  --role=roles/run.invoker >/dev/null

# Create the scheduler job, or update it if it already exists
COMMON_ARGS=(
  --location="$REGION"
  --schedule="$SCHEDULE"
  --time-zone="$TIME_ZONE"
  --uri="$RENEW_URL"
  --http-method=POST
  --oidc-service-account-email="$INVOKER_SA"
  --oidc-token-audience="$RENEW_URL"
)

if gcloud scheduler jobs describe "$JOB_NAME" --location="$REGION" \
    >/dev/null 2>&1; then
  echo "Updating existing scheduler job '$JOB_NAME'..."
  gcloud scheduler jobs update http "$JOB_NAME" "${COMMON_ARGS[@]}" >/dev/null
else
  echo "Creating scheduler job '$JOB_NAME'..."
  gcloud scheduler jobs create http "$JOB_NAME" "${COMMON_ARGS[@]}" >/dev/null
fi

echo "Scheduler job '$JOB_NAME' is set up:"
echo "   schedule:   $SCHEDULE ($TIME_ZONE)"
echo "   target:     $RENEW_URL"
echo "   invoker SA: $INVOKER_SA"
echo
echo "Trigger it manually to verify:"
echo "  gcloud scheduler jobs run $JOB_NAME --location=$REGION"
