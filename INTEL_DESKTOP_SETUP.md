# Intel Desktop Setup Guide - Social Capital CRM with Concordia

**Created**: 2025-11-04
**For**: Intel Core i9 Ultra Desktop (x86_64 architecture)
**Status**: Ready to build and deploy

---

## What Was Done in This Session

### 1. Fixed Concordia Participant Selection (COMPLETED ✅)
- **Issue**: Null values in participant array causing 400 errors
- **Root Cause**: Checkbox event handling bug + UUID vs integer type mismatch
- **Fix**:
  - Updated checkbox to use label wrapper with proper onChange handler
  - Removed incorrect `parseInt()` calls (person IDs are UUIDs, not integers)
  - Fixed backend validation from `isInt()` to `isUUID()`
  - Updated SQL queries from `::int[]` to `::uuid[]`

### 2. Fixed Missing AI Configuration Columns (COMPLETED ✅)
- **Issue**: `column "ai_provider" does not exist` error
- **Root Cause**: Migration 013 had wrong column names
- **Fix**: Created migration 021 adding: `ai_provider`, `ai_model`, `ai_api_url`, `api_key`

### 3. Attempted Python/Concordia Installation (IN PROGRESS ⏳)
- **Issue**: PyTorch doesn't support Alpine Linux on ARM64 architecture
- **Problem**: Your laptop is ARM64 (Apple Silicon or ARM-based), PyTorch wheels unavailable
- **Solution**: Switching to Intel desktop with x86_64 architecture

### 4. Configured for Intel Desktop (COMPLETED ✅)
- **Changed**: All Dockerfiles and docker-compose.yml now specify `platform: linux/amd64`
- **Effect**: Docker will build for x86_64 (Intel/AMD) architecture
- **Benefit**: PyTorch has full pre-built wheel support for x86_64

---

## Current State of Code

### Files Modified for Intel Architecture

1. **backend/Dockerfile**
   - Changed: `FROM --platform=linux/amd64 node:18-slim`
   - Changed: `apk` → `apt-get` (Alpine → Debian)
   - Added: Python3 + build dependencies for Concordia

2. **frontend/Dockerfile**
   - Changed: Both stages use `FROM --platform=linux/amd64`
   - Stage 1: node:18-alpine (build)
   - Stage 2: nginx:alpine (serve)

3. **docker-compose.yml**
   - Added: `platform: linux/amd64` to all three services (db, backend, frontend)

4. **backend/src/services/concordia-service/requirements.txt**
   - Added: `torch>=1.11.0` (required by sentence-transformers)

5. **backend/src/db/migrations/021_add_concordia_ai_columns.sql** (NEW)
   - Created: Migration adding AI configuration columns to users table

### Database Migrations Applied
- ✅ Migration 021: AI configuration columns added and verified

---

## Setup Instructions for Intel Desktop

### Prerequisites
- Docker Desktop installed and running
- Git installed
- 16GB+ RAM recommended (for PyTorch build)
- 10GB+ free disk space

### Step 1: Transfer Project Files

**Option A: Git Clone (if pushed to repo)**
```bash
cd C:\Users\YourUsername\Projects
git clone <your-repo-url>
cd "Project 26 - Social Capital"
```

**Option B: Copy from OneDrive**
```bash
# Copy entire project folder from:
# C:\Users\migue\OneDrive\AI\claudeprojects\ClaudeCode\Project 26 - Social Capital
# To your Intel desktop
```

### Step 2: Verify Docker Platform

```bash
# Check Docker is running
docker --version

# Verify you're on x86_64
docker info | findstr "Architecture"
# Should show: Architecture: x86_64
```

### Step 3: Build Backend (This Takes Time!)

```bash
cd "C:\Users\YourUsername\Path\To\Project 26 - Social Capital"

# Build backend with Python + Concordia dependencies
# EXPECTED TIME: 15-20 minutes (first time)
# EXPECTED SIZE: ~2.5GB final image
docker-compose build backend
```

**What's happening during build:**
1. Downloads Debian base image (~100MB)
2. Installs system packages (~200MB)
3. Installs Node.js dependencies (~100MB)
4. **Downloads PyTorch** (~800MB) - this is the slow part
5. Installs gdm-concordia (~50MB)
6. Installs sentence-transformers + dependencies (~500MB)
7. Installs numpy, psycopg2, etc. (~200MB)

**Total build time**: 15-20 minutes
**Final image size**: ~2.5GB

### Step 4: Build Frontend (Fast)

```bash
# Build frontend (should only take 2-3 minutes)
docker-compose build frontend
```

### Step 5: Start All Services

```bash
# Start database, backend, and frontend
docker-compose up -d

# Check status
docker-compose ps

# Watch logs (optional)
docker-compose logs -f backend
```

**Expected Output:**
```
NAME                     STATUS              PORTS
socialcapital-db         Up (healthy)        0.0.0.0:5432->5432/tcp
socialcapital-backend    Up (healthy)        0.0.0.0:5000->5000/tcp
socialcapital-frontend   Up (healthy)        0.0.0.0:80->80/tcp
```

### Step 6: Verify Installation

```bash
# Test backend health
curl http://localhost:5000/health
# Should return: {"ok":true}

# Test frontend
curl http://localhost/health
# Should return: healthy

# Check Python is available in backend
docker exec socialcapital-backend python3 --version
# Should show: Python 3.11.x

# Check Concordia is installed
docker exec socialcapital-backend python3 -c "import concordia; print('Concordia OK')"
# Should show: Concordia OK
```

### Step 7: Test Concordia Simulation

1. Open browser: http://localhost
2. Login with demo credentials:
   - Email: `demo@socialcapital.local`
   - Password: `demo123`
3. Navigate to: **Concordia** page
4. Select 2-10 participants
5. Click "Next: Configure Scenario"
6. Enter scenario (e.g., "A wedding reception at a hotel. All participants are guests.")
7. Click "Run Simulation"

**Expected Result**:
- Simulation completes successfully
- Transcript appears on Results tab
- No Python errors in backend logs

---

## Troubleshooting Guide

### Build Fails: "Out of Memory"

**Symptom**: Build crashes during PyTorch installation
**Solution**: Increase Docker Desktop memory allocation
```
Docker Desktop → Settings → Resources → Memory
Increase to 8GB minimum (12GB recommended)
```

### Build Fails: "Cannot connect to Docker daemon"

**Symptom**: `error during connect: This error may indicate that the docker daemon is not running`
**Solution**:
```bash
# Start Docker Desktop application
# Wait for it to fully start (whale icon should be stable)
# Then retry: docker-compose build backend
```

### Backend Won't Start: "Port 5000 already in use"

**Symptom**: Backend container exits immediately
**Solution**:
```bash
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process or change port in docker-compose.yml:
# ports:
#   - "5001:5000"  # Changed from 5000:5000
```

### Concordia Simulation Fails: "spawn python3 ENOENT"

**Symptom**: Error when running simulation
**Solution**: Backend wasn't built with Python
```bash
# Rebuild backend
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Database Connection Errors

**Symptom**: Backend logs show "ECONNREFUSED" or "database does not exist"
**Solution**:
```bash
# Stop all containers
docker-compose down

# Remove volumes (CAREFUL: deletes data!)
docker volume rm project26-socialcapital_postgres_data

# Restart fresh
docker-compose up -d
```

---

## Performance Expectations on Intel Desktop

| Task | Expected Time |
|------|--------------|
| First backend build | 15-20 minutes |
| Subsequent backend builds | 2-3 minutes (cached layers) |
| Frontend build | 2-3 minutes |
| Container startup | 30-60 seconds |
| Concordia simulation (10 turns) | 30-90 seconds |
| Concordia simulation (20 turns) | 60-180 seconds |

---

## Architecture Differences: ARM64 vs x86_64

### Why This Failed on Your Laptop (ARM64)
- **PyTorch**: No pre-built wheels for Alpine Linux ARM64
- **Build Time**: Would require compiling PyTorch from source (2-4 hours)
- **Success Rate**: Low (many compilation errors)

### Why This Works on Intel Desktop (x86_64)
- **PyTorch**: Full pre-built wheel support
- **Build Time**: Download pre-built binaries (15 minutes)
- **Success Rate**: Very high (standard setup)

---

## Next Session Checklist

When you start your next Claude Code session on the Intel desktop:

### ✅ Before Starting
- [ ] Docker Desktop is running
- [ ] Project files are copied to Intel desktop
- [ ] At least 10GB free disk space
- [ ] Stable internet connection (for downloads)

### 📋 First Commands to Run
```bash
cd "C:\Users\YourUsername\Path\To\Project 26 - Social Capital"

# Build backend (grab coffee, this takes 15-20 min)
docker-compose build backend

# Build frontend (quick, 2-3 min)
docker-compose build frontend

# Start everything
docker-compose up -d

# Check health
docker-compose ps
docker-compose logs -f backend | findstr "Server listening"
```

### 🧪 Testing Concordia
1. Navigate to http://localhost/concordia
2. Select 4-6 participants (more = longer simulation)
3. Scenario: "A coffee shop meeting. Everyone is discussing a startup idea."
4. Max turns: 10 (start small)
5. Click "Run Simulation"
6. Watch backend logs for Python output

### 📊 Expected Backend Logs
```
🚀 Social Capital CRM Server
✓ Server listening on port 5000
Received participantIds: ["uuid1","uuid2",...] Types: ['string','string',...]
[Concordia] Starting simulation with 4 participants...
[Concordia] Turn 1/10 complete
[Concordia] Turn 2/10 complete
...
[Concordia] Simulation complete!
```

---

## Files You Can Reference

### Documentation Created
1. **CONCORDIA_INSTALLATION_SOLUTIONS.md** - 5 different approaches analyzed
2. **INTEL_DESKTOP_SETUP.md** - This file (complete setup guide)

### Key Configuration Files
- `backend/Dockerfile` - Debian-based with Python/Concordia
- `docker-compose.yml` - All services set to `platform: linux/amd64`
- `backend/src/services/concordia-service/requirements.txt` - Python dependencies

### Database Migrations
- `backend/src/db/migrations/021_add_concordia_ai_columns.sql` - AI config columns

---

## What to Tell Next Claude Code Session

**Summary for Claude Code:**
> "This is a Social Capital CRM project with Google DeepMind Concordia integration. The project was previously running on an ARM64 laptop but PyTorch installation failed. I've now moved to an Intel Core i9 Ultra desktop (x86_64). All Dockerfiles and docker-compose.yml have been configured for linux/amd64 platform. The backend uses node:18-slim (Debian) with Python 3.11, PyTorch, and gdm-concordia installed. Database migrations are complete (including migration 021 for AI columns). Ready to build and test Concordia simulations. First build will take 15-20 minutes due to PyTorch download."

**Current Status:**
- ✅ Concordia UI working (participant selection, scenario config)
- ✅ Database schema complete with AI columns
- ✅ UUID handling fixed throughout
- ⏳ Backend with Python/Concordia needs to be built on Intel desktop
- ❌ Concordia simulations not yet tested (requires Python)

**Next Immediate Task:**
Build backend on Intel desktop and test Concordia simulation end-to-end.

---

## Commands Quick Reference

```bash
# BUILD
docker-compose build backend        # 15-20 min first time
docker-compose build frontend       # 2-3 min

# START
docker-compose up -d                # Start all services
docker-compose ps                   # Check status
docker-compose logs -f backend      # Watch backend logs

# RESTART
docker-compose restart backend      # Quick restart
docker-compose restart frontend     # Quick restart

# REBUILD (after code changes)
docker-compose down                 # Stop all
docker-compose build backend        # Rebuild
docker-compose up -d                # Start again

# CLEAN SLATE
docker-compose down -v              # Stop + delete volumes
docker system prune -a              # Clean everything (CAREFUL!)

# HEALTH CHECKS
curl http://localhost:5000/health   # Backend
curl http://localhost/health        # Frontend
docker exec socialcapital-backend python3 --version  # Python
docker exec socialcapital-backend python3 -c "import concordia; print('OK')"  # Concordia
```

---

## Success Criteria

You'll know everything is working when:
1. ✅ All 3 containers show "Up (healthy)" status
2. ✅ Backend logs show "Server listening on port 5000"
3. ✅ Frontend loads at http://localhost
4. ✅ Concordia page allows selecting participants and configuring scenario
5. ✅ Running simulation completes without errors
6. ✅ Transcript appears on Results tab
7. ✅ No Python errors in backend logs

---

**Good luck with the Intel desktop build! The x86_64 architecture will make this much smoother. 🚀**
