# Deploy Meeting Copilot to Google Cloud Run

## Prerequisites

1. **Install Google Cloud SDK** (if not installed):
   ```bash
   # macOS (Homebrew)
   brew install --cask google-cloud-sdk

   # Or download from https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticate and set project**:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Enable required APIs**:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   ```

## 1. Create Secrets (recommended for production)

Store sensitive values in Secret Manager:

```bash
# Gemini API key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-key --data-file=-

# JWT secret (use a strong random string)
echo -n "$(openssl rand -base64 32)" | gcloud secrets create jwt-secret --data-file=-

# Supabase Postgres connection string
echo -n "postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" | gcloud secrets create database-url --data-file=-
```

Grant Cloud Run access to secrets (replace PROJECT_ID and REGION):
```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding gemini-key --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding jwt-secret --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding database-url --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
```

## 2. Deploy

### Option A: Quick deploy (env vars only)

```bash
./deploy.sh
```

Then add environment variables in [Cloud Run Console](https://console.cloud.google.com/run):
- **GEMINI_API_KEY** – Your Gemini API key
- **JWT_SECRET** – Strong random string
- **DATABASE_URL** – Supabase Postgres connection string
- **APP_URL** – Your Cloud Run URL (e.g. `https://meeting-copilot-xxx.run.app`)
- **CORS_ORIGIN** – Same as APP_URL, or your frontend domain

### Option B: Deploy with secrets

```bash
gcloud run deploy meeting-copilot \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 900 \
  --set-env-vars "NODE_ENV=production,USE_SQLITE_FOR_DEV=false" \
  --set-secrets "GEMINI_API_KEY=gemini-key:latest,JWT_SECRET=jwt-secret:latest,DATABASE_URL=database-url:latest" \
  --project YOUR_PROJECT_ID
```

After first deploy, set **APP_URL** and **CORS_ORIGIN** to your service URL:
```bash
SERVICE_URL=$(gcloud run services describe meeting-copilot --region us-central1 --format 'value(status.url)')
gcloud run services update meeting-copilot --region us-central1 --set-env-vars "APP_URL=$SERVICE_URL,CORS_ORIGIN=$SERVICE_URL"
```

## 3. Run database migrations

Migrations run automatically on startup when using Postgres. To run manually:
```bash
# From your local machine (with DATABASE_URL set)
npm run db:migrate
```

## 4. Verify

Visit your Cloud Run URL. You should see the Meeting Copilot app.
