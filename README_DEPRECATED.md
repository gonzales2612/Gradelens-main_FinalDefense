# GradeLens - OMR

This document describes the **only supported ways** to run GradeLens.

The system consists of:
- Redis (Job Queue)
- CV Worker (Image Processing Consumer)
- CV API (FastAPI, health/debug)
- Node API (Ingress, Application Logic)
- Mongo DB (Persistence)

There are **two modes**:
1. Docker (standard, recommended)
2. Local (development only)

---

## Prerequisites

### Required (Docker mode)
- Docker Desktop (AMD64)
- WSL2 enabled (Windows)
- Docker daemon running

Verify:
```bash
docker version
```

## 🟢 Mode 1 — Docker (STANDARD / RECOMMENDED)

This is the **authoritative way** to run the compute layer.
All services run in containers, with correct filesystem isolation.

### Services started
- Redis
- CV Worker
- CV API
- Node API
- Mongo DB

### One command to run everything
```bash
cd gradelens/infra
docker compose up --build
```

## Frontend Development

Run locally for fastest iteration:

```bash
cd presentation/frontend
npm install
npm run dev
```

### Host Directory:
- gradelens/storage/scans/

### Container path:
- /data/scans

### Images must exist on the host:
- storage/scans/sample_test.jpg


### Push a test job (manual)
```bash 
docker exec -it gradelens-redis redis-cli
```
```bash
LPUSH scan_jobs "{
  \"scan_id\": \"test_001\",
  \"image_path\": \"sample_test.jpg\",
  \"template\": \"form_A\"
}"
```

### View logs
```bash
docker logs -f gradelens-cv-worker
```

### Stop Everything
```bash
docker compose down
```

### Stop and Delete
```bash
docker compose down -v
```

### Use MongoDB
```bash
docker exec -it gradelens-mongo mongosh
```
- Seed Collections
```bash
npx tsx src/scripts/seed-admin.ts
```

- Export Document
```bash
docker exec gradelens-mongo mongosh gradelens --quiet --eval "printjson(db.scans.find().toArray())" > scan_full_pretty.json
```

### Frequent Errors
- Docker sometimes cache the build, especially when installing new packages.
- Ensure that you installed the package in the correct directory (including if it is installed in dependencies and not devDependencies).
```bash
docker compose down -v
docker compose build api --no-cache
docker compose up
```
- Now check
```bash
docker exec -it gradelens-api sh
ls node_modules/cors
```

---

## 🟡 Mode 2 — Local (DEVELOPMENT ONLY)

This mode is for debugging or iterating on code.
It is not production-aligned.

### Requirements
- Python virtualenv
- Redis running (Docker or local)

### Setup
```bash
py -m venv .venv
.\.venv\Scripts\Activate.ps1
cd compute/cv
pip install -r requirements.txt
```

### Start Redis (Docker)
```bash
docker run -d --name redis -p 6379:6379 redis:7
```

### Run CV Worker (Local)
```bash
python -m app.workers.scan_worker
```

⚠️ In local mode, image paths are resolved relative to the project.
Docker-style paths (/data/scans) do not apply.

### Run CV API (Local)
```bash
uvicorn main:app --reload
```