#!/bin/bash
# Deploy Meeting Copilot to Google Cloud Run
# Prerequisites: gcloud CLI installed and authenticated, GCP project configured

set -e

# Configuration - override with environment variables
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-meeting-copilot}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: GCP project not set. Run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

echo "Deploying $SERVICE_NAME to Cloud Run..."
echo "  Project: $PROJECT_ID"
echo "  Region:  $REGION"
echo ""

# Deploy using Dockerfile (--source builds from Dockerfile)
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 900 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "USE_SQLITE_FOR_DEV=false" \
  --project "$PROJECT_ID"

# Get the service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)' --project "$PROJECT_ID")
echo ""
echo "Deployment complete!"
echo "Service URL: $SERVICE_URL"
echo ""
echo "IMPORTANT: Configure these secrets/env vars in Cloud Run Console:"
echo "  - GEMINI_API_KEY"
echo "  - JWT_SECRET"
echo "  - DATABASE_URL (Supabase Postgres connection string)"
echo "  - APP_URL=$SERVICE_URL"
echo "  - CORS_ORIGIN=$SERVICE_URL (or add your frontend domain)"
echo ""
echo "To set secrets: gcloud run services update $SERVICE_NAME --region $REGION --set-secrets=..."
echo "To set env vars: gcloud run services update $SERVICE_NAME --region $REGION --set-env-vars=..."
