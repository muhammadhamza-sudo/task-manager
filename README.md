# Task Manager — Complete Deployment Guide (Python DRF + React)

> **This is the EVALUATOR'S version** with a completed CI/CD pipeline and step-by-step deployment instructions. Do NOT distribute to ASEs.

---

## Quick Reference

| Component | Local URL | Tech |
|-----------|-----------|------|
| Frontend | http://localhost:3000 | React 18, nginx |
| Backend API | http://localhost:8000/api/tasks/ | Django 5.1, DRF, gunicorn |
| Database | SQLite (file-based) | Auto-migrated on startup |

---

## Step 1: Verify Locally with Docker Compose

```bash
# Build and start both containers
docker-compose up --build

# Test the backend API directly
curl http://localhost:8000/api/tasks/
# Expected: [] (empty list)

# Create a task via API
curl -X POST http://localhost:8000/api/tasks/ \
  -H "Content-Type: application/json" \
  -d '{"title": "Test task", "priority": "high"}'
# Expected: 201 Created with task JSON

# Open the frontend
# http://localhost:3000
# You should see the Task Manager UI and the task you just created

# Stop containers
docker-compose down
```

---

## Step 2: Create a Docker Hub Account and Push Images

### 2a. Create Docker Hub account
1. Go to https://hub.docker.com/signup
2. Sign up (free tier is fine)
3. Go to Account Settings → Security → New Access Token
4. Name it "github-actions", select "Read, Write, Delete" permissions
5. Copy the token — you'll need it later

### 2b. Push images manually (first time)

```bash
# Login to Docker Hub
docker login -u YOUR_DOCKERHUB_USERNAME

# Build and tag the backend image
docker build -t YOUR_DOCKERHUB_USERNAME/taskmanager-backend:latest ./backend

# Build and tag the frontend image
docker build -t YOUR_DOCKERHUB_USERNAME/taskmanager-frontend:latest \
  --build-arg REACT_APP_API_URL=/api ./frontend

# Push both images
docker push YOUR_DOCKERHUB_USERNAME/taskmanager-backend:latest
docker push YOUR_DOCKERHUB_USERNAME/taskmanager-frontend:latest
```

---

## Step 3: Deploy to Railway

### 3a. Create Railway account
1. Go to https://railway.app
2. Click "Login" → "Login with GitHub" (no card required)
3. Authorize Railway to access your GitHub

### 3b. Create a Railway project with two services
1. Click **"New Project"** → **"Empty Project"**
2. You now have an empty project. Click **"+ New"** in the project canvas.

**Create the backend service:**
1. Click **"+ New"** → **"Docker Image"**
2. Enter: `YOUR_DOCKERHUB_USERNAME/taskmanager-backend:latest`
3. Railway will pull the image and deploy it
4. Click on the service → **Settings** tab:
   - Under **Networking** → click **"Generate Domain"** to get a public URL
   - Note the port — Railway should auto-detect `8000` from the Dockerfile. If not, add a variable `PORT=8000` under the **Variables** tab.
5. Wait for the deploy to complete (green status)
6. Test: open `https://YOUR-BACKEND-DOMAIN.up.railway.app/api/tasks/` in browser
   - You should see `[]` (empty JSON array)

**Create the frontend service:**
1. Click **"+ New"** → **"Docker Image"**
2. Enter: `YOUR_DOCKERHUB_USERNAME/taskmanager-frontend:latest`
3. Click on the service → **Settings** tab:
   - Under **Networking** → click **"Generate Domain"**
   - If Railway doesn't auto-detect the port, add `PORT=80` in **Variables**
4. Wait for deploy to complete

### 3c. Connect frontend to backend

The frontend's nginx is configured to proxy `/api/` to `http://backend:8000` — this works in Docker Compose but NOT on Railway (services don't share a Docker network).

**Fix: Update nginx.conf to point to your Railway backend URL:**

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        # REPLACE this with your Railway backend URL
        proxy_pass https://YOUR-BACKEND-DOMAIN.up.railway.app/api/;
        proxy_set_header Host YOUR-BACKEND-DOMAIN.up.railway.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_ssl_server_name on;
    }
}
```

Then rebuild and push the frontend image:

```bash
docker build -t YOUR_DOCKERHUB_USERNAME/taskmanager-frontend:latest \
  --build-arg REACT_APP_API_URL=/api ./frontend
docker push YOUR_DOCKERHUB_USERNAME/taskmanager-frontend:latest
```

On Railway, click the frontend service → **Settings** → **"Redeploy"** (or it will auto-redeploy if configured).

### 3d. Verify end-to-end
1. Open your Railway frontend URL in a browser
2. Create a task → it should appear in the list
3. Edit, toggle done, delete — all CRUD operations should work
4. Open your backend URL `/api/tasks/` → you should see the task data

---

## Step 4: Set Up GitHub Actions CI/CD

### 4a. Create a GitHub repository
```bash
git init
git add .
git commit -m "Initial commit: Task Manager with Docker + CI/CD"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/taskmanager-cicd.git
git push -u origin main
```

### 4b. Get your Railway API token
1. Go to https://railway.app → click your profile (bottom-left) → **Account Settings**
2. Click **"Tokens"** → **"Create Token"**
3. Name it `github-actions`, copy the token

### 4c. Get your Railway Service IDs
1. Open your Railway project in the dashboard
2. Click on the **backend service** → **Settings** tab
3. The **Service ID** is shown under "Service Info" — copy it
4. Do the same for the **frontend service**

### 4d. Add GitHub Secrets
Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 5 secrets:

| Secret Name | Value |
|-------------|-------|
| `DOCKER_USERNAME` | Your Docker Hub username |
| `DOCKER_PASSWORD` | Your Docker Hub access token (from Step 2a) |
| `RAILWAY_TOKEN` | Your Railway API token (from Step 4b) |
| `RAILWAY_BACKEND_SERVICE_ID` | Backend service ID from Railway (from Step 4c) |
| `RAILWAY_FRONTEND_SERVICE_ID` | Frontend service ID from Railway (from Step 4c) |

### 4e. Verify the pipeline
1. Make a small change (e.g., edit this README)
2. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "Test CI/CD pipeline"
   git push
   ```
3. Go to your GitHub repo → **Actions** tab
4. You should see the pipeline running with 3 jobs:
   - **test-backend** → runs Django tests
   - **build-and-push** → builds Docker images, pushes to Docker Hub
   - **deploy** → triggers Railway redeploy via CLI
5. All 3 jobs should show green checkmarks ✅

### 4f. Verify the live update
1. After the pipeline completes, wait 1-2 minutes for Railway to pull the new images
2. Open your Railway frontend URL — the app should be live and working
3. Any future pushes to `main` will automatically: test → build → deploy

---

## Troubleshooting

### "Connection refused" when frontend calls backend
- The nginx proxy_pass URL is still pointing to `http://backend:8000` (Docker Compose internal network)
- Fix: Update `nginx.conf` to use your Railway backend's public URL (see Step 3c)

### Railway says "Port not detected"
- Add a `PORT` variable in the service's Variables tab
- Backend: `PORT=8000`
- Frontend: `PORT=80`

### GitHub Actions "build-and-push" job is skipped
- This job only runs on pushes to `main`, not on pull requests
- Check that you're pushing to `main`, not a feature branch

### Railway deploy shows "No changes detected"
- Railway caches Docker images by digest — if the image didn't change, it won't redeploy
- Make an actual code change, rebuild the image, push, then redeploy

### Backend returns "Bad Request (400)" on Railway
- Django's `ALLOWED_HOSTS` may not include your Railway domain
- The provided settings.py uses `ALLOWED_HOSTS = '*'` which allows all hosts
- If you've changed this, add your Railway domain to the allowed list

### SQLite data resets on redeploy
- This is expected — Railway containers are ephemeral and SQLite data doesn't persist across deploys
- For production, you'd use a Railway PostgreSQL service instead
- For this exercise, SQLite is fine — the focus is on the CI/CD pipeline, not data persistence

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Actions                        │
│                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  Test     │───▶│ Build & Push │───▶│ Deploy to     │  │
│  │  Backend  │    │ Docker Hub   │    │ Railway (CLI) │  │
│  └──────────┘    └──────────────┘    └───────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Docker Hub                            │
│                                                         │
│  taskmanager-backend:latest   taskmanager-frontend:latest│
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Railway                               │
│                                                         │
│  ┌──────────────────┐     ┌──────────────────────────┐  │
│  │ Backend Service   │     │ Frontend Service          │  │
│  │ Django + Gunicorn │◀────│ React (nginx)             │  │
│  │ Port 8000         │     │ Port 80                   │  │
│  │ /api/tasks/       │     │ /api/ → proxy to backend  │  │
│  └──────────────────┘     └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```
Editing Readme