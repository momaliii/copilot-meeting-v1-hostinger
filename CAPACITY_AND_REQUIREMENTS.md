# Meeting Copilot — Capacity & Infrastructure Requirements

## Estimated Concurrent Users (Single Instance)

| User Type | Concurrent Users | Notes |
|-----------|------------------|-------|
| **Browsing / idle** (viewing dashboard, settings) | **50–100** | Light API usage, minimal memory |
| **Active** (recording, viewing meetings, support chat) | **20–40** | Socket.io + API calls |
| **Live transcribing** (Deepgram WebSocket) | **10–20** | ~5–15 MB per stream, CPU for audio |
| **AI analysis running** (Gemini processing) | **5–10** | Each holds connection 2–15 min |
| **Mixed realistic load** | **30–50** | Typical mix of the above |

### What Limits Concurrency?

1. **Rate limits (per IP)**  
   - 600 API requests / 15 min  
   - 120 mutations / 15 min  
   - AI: 15–200 / 15 min (by plan)

2. **Single Node.js process**  
   - One process handles all requests  
   - I/O-bound (DB, external APIs) scales well  
   - Long AI requests tie up connections

3. **Memory**  
   - ~256 MB heap (current config)  
   - ~170 MB RSS per process  
   - Each transcription stream adds ~5–15 MB

4. **Database**  
   - PostgreSQL default pool: ~10 connections  
   - Supabase free tier: 2 connections (use pooler for more)

5. **External APIs**  
   - Gemini: plan limits  
   - Deepgram: plan limits  
   - Google: OAuth quotas

---

## Infrastructure Requirements

### Minimum (Development / Small Beta)

| Resource | Spec |
|----------|------|
| **RAM** | 512 MB |
| **CPU** | 1 vCPU |
| **Storage** | 2 GB |
| **Database** | Supabase Free (PostgreSQL) or SQLite |
| **Users** | ~10–20 concurrent |

### Recommended (Production, Small SaaS)

| Resource | Spec |
|----------|------|
| **RAM** | 1 GB |
| **CPU** | 2 vCPU |
| **Storage** | 10 GB |
| **Database** | Supabase Pro or managed Postgres |
| **Users** | ~30–50 concurrent |

### Scaling (100+ Concurrent Users)

| Approach | Action |
|----------|--------|
| **Horizontal** | Run 2–4 app instances behind a load balancer |
| **Database** | Use connection pooler (Supabase Pooler, PgBouncer) |
| **Memory** | Increase `--max-old-space-size=512` per instance |
| **WebSockets** | Use Redis adapter for Socket.io across instances |

### Enterprise (1000+ Concurrent Users)

| Resource | Spec |
|----------|------|
| **App instances** | 3–5+ (1–2 GB RAM, 2 vCPU each) |
| **Redis** | Required (Socket.io, rate limits, job queue) |
| **Database** | Managed Postgres + pooler (50–100 connections) |
| **File storage** | S3/GCS for uploads |
| **Workers** | 2–4 for AI job queue |
| **See** | [Scaling to 1000+ Users](#scaling-to-1000-users) section below |

---

## Rate Limits (Built-in)

| Limit | Value | Scope |
|-------|-------|-------|
| API (general) | 600 / 15 min | Per IP |
| Mutations (write) | 120 / 15 min | Per IP |
| AI (Starter) | 15 / 15 min | Per user |
| AI (Pro) | 60 / 15 min | Per user |
| AI (Admin) | 200 / 15 min | Per user |
| Contact form | 5 / hour | Per IP |
| 2FA verify | 10 / 15 min | Per IP |

---

## Scaling Checklist

- [ ] Increase heap: `--max-old-space-size=512` for heavier loads
- [ ] Use Postgres connection pooler (Supabase Pooler)
- [ ] Add Redis for Socket.io if running multiple instances
- [ ] Monitor memory and response times
- [ ] Consider a queue (e.g. Bull/BullMQ) for AI jobs
- [ ] Use CDN for static assets
- [ ] Enable `TRUST_PROXY=true` behind reverse proxy

---

## Scaling to 1000+ Users

### Architecture Overview

| Component | Requirement |
|-----------|--------------|
| **App instances** | 3–5+ behind load balancer (each ~200–300 concurrent users) |
| **Redis** | Required for Socket.io adapter + rate limiting + job queue |
| **Job queue** | Bull/BullMQ for AI analysis (offload long-running work) |
| **Database** | Managed Postgres with connection pooler (50–100 connections) |
| **File storage** | S3/GCS for uploads (shared across instances) |
| **Load balancer** | Sticky sessions for WebSocket connections |

### Key Changes Required

1. **Multiple app instances + load balancer**
   - Run 3–5 Node instances (1–2 GB RAM, 2 vCPU each)
   - Use sticky sessions so WebSocket users stay on same instance

2. **Redis for shared state**
   - **Socket.io Redis adapter** — support chat & presence work across instances
   - **Redis-based rate limiting** — replace in-memory limits
   - **Job queue** — Bull/BullMQ for AI analysis

3. **Job queue for AI**
   - Move AI analysis to background workers
   - API returns immediately; workers process in background
   - Prevents long requests from blocking the server

4. **Database**
   - Connection pooler (PgBouncer, Supabase Pooler)
   - Consider read replicas for analytics
   - Ensure indexes on hot queries

5. **File storage**
   - Store uploads in S3/GCS, not local disk
   - All instances access same storage

6. **External API limits**
   - Upgrade Gemini / Deepgram plans for higher quotas
   - Monitor usage and add key rotation if needed

### Implementation Order

1. Add Redis + Socket.io Redis adapter
2. Switch rate limiting to Redis-backed
3. Add job queue for AI analysis
4. Move file uploads to S3/GCS
5. Add monitoring (APM, logs, alerts)
6. Scale instances based on metrics

### Rough Cost (Monthly)

| Service | Estimate |
|---------|----------|
| App hosting (3–5 instances) | $50–150 |
| Redis (managed) | $15–50 |
| Database (managed Postgres) | $25–100 |
| Object storage (S3/GCS) | $5–20 |
| **Total** | **~$100–350** |

*Plus Gemini, Deepgram, and other API costs.*

---

## Quick Reference: Hosting Options

| Platform | RAM | Concurrent Users (est.) |
|----------|-----|-------------------------|
| Railway | 512 MB–8 GB | 20–100+ |
| Render | 512 MB–4 GB | 20–80 |
| Fly.io | 256 MB–4 GB | 15–80 |
| DigitalOcean App Platform | 512 MB–2 GB | 20–60 |
| AWS EC2 / GCP | 1–4 GB | 50–200+ |

*Estimates assume typical mixed usage and a single instance.*
