# Supabase + Cloud Run Setup

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project (choose a region close to your users)
3. Wait for the project to be provisioned
4. Go to **Project Settings > Database** and copy the **Connection string (URI)**
5. Use the **Transaction** or **Session** pooler URL for server-side connections (port 6543 for pooler, or 5432 for direct)

## 2. Configure Environment

Add to your `.env` (or Cloud Run env vars):

```
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

For local development with Postgres, set `USE_SQLITE_FOR_DEV=false` and provide `DATABASE_URL`.

## 3. Run Migrations

After the schema is created, run the migration:

```bash
npm run db:migrate
```

Or the app will auto-run migrations on startup when using Postgres.

## 4. Deploy to Cloud Run

```bash
# Build and push (replace with your project ID and region)
gcloud run deploy meeting-copilot \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "GEMINI_API_KEY=gemini-key:latest,JWT_SECRET=jwt-secret:latest,DATABASE_URL=database-url:latest"
```

Create secrets in Secret Manager first:

```bash
echo -n "your-gemini-key" | gcloud secrets create gemini-key --data-file=-
echo -n "your-jwt-secret" | gcloud secrets create jwt-secret --data-file=-
echo -n "postgresql://..." | gcloud secrets create database-url --data-file=-
```

## 5. Set APP_URL

After deployment, set `APP_URL` to your Cloud Run service URL (e.g. `https://meeting-copilot-xxx.run.app`).
