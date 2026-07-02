# 📚 BookStore — Full-Stack Web App

A book-selling web app with **Admin** and **Buyer** roles, deployable to AWS with GitHub Actions CI/CD.

---

## Features

| Role  | Capabilities |
|-------|-------------|
| Admin | Add / edit / delete books (name, price, stock, description) · View all orders |
| Buyer | Browse & search books · Click for full description · Select quantity & buy |

**Default admin credentials:** `admin@bookstore.com` / `admin123`

---

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18 + Vite + React Router |
| Backend  | Node.js + Express + better-sqlite3 |
| Auth     | JWT (role-based: admin / user) |
| Container| Docker + Nginx |
| CI/CD    | GitHub Actions |
| Cloud    | AWS EC2 + ECR |

---

## Project Structure

```
demo_webapp/
├── backend/
│   ├── src/
│   │   ├── app.js            # Express entry point
│   │   ├── db.js             # SQLite setup + seed data
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT + admin guard
│   │   └── routes/
│   │       ├── auth.js       # POST /api/auth/login|register
│   │       ├── books.js      # CRUD /api/books
│   │       └── orders.js     # POST/GET /api/orders
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Routes + auth guards
│   │   ├── context/AuthContext.jsx
│   │   ├── services/api.js   # Axios calls
│   │   ├── components/       # Navbar, BookCard, BookModal
│   │   └── pages/            # Login, Register, BookStore, AdminDashboard, Orders
│   ├── nginx.conf            # SPA routing + API proxy
│   └── Dockerfile            # Multi-stage: build then Nginx
├── docker-compose.yml        # Local dev: both services
├── .github/workflows/
│   └── deploy.yml            # CI/CD pipeline
└── README.md
```

---

## Local Development

### Option A — Docker Compose (recommended)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/bookstore.git
cd bookstore

# 2. Start everything
docker compose up --build

# App is at http://localhost:80
# API is at http://localhost:3001
```

### Option B — Run directly (Node.js required)

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env          # edit JWT_SECRET
npm install
npm run dev                   # http://localhost:3001

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

---

## API Reference

```
POST  /api/auth/register    { email, password }
POST  /api/auth/login       { email, password }

GET   /api/books            public — list all books
GET   /api/books/:id        public — get one book
POST  /api/books            admin  — create book
PUT   /api/books/:id        admin  — update book
DELETE /api/books/:id       admin  — delete book

POST  /api/orders           auth   — place order  { items: [{bookId, quantity}] }
GET   /api/orders           auth   — own orders (admin sees all)

GET   /health               liveness probe
```

---

## AWS Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          GITHUB                                      │
│                                                                      │
│  developer push ──► main branch ──► GitHub Actions CI/CD Pipeline   │
│                                                                      │
│   ┌────────────┐   ┌─────────────────┐   ┌──────────────────────┐  │
│   │  Job 1     │──►│  Job 2           │──►│  Job 3               │  │
│   │  Test &    │   │  Build Docker    │   │  Deploy to EC2       │  │
│   │  Build     │   │  Push to ECR     │   │  via SSH             │  │
│   └────────────┘   └─────────────────┘   └──────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
          │                    │                        │
          │              ┌─────▼──────┐         ┌──────▼──────────────┐
          │              │  AWS ECR   │         │   AWS EC2 (t2.micro)│
          │              │            │         │                     │
          │              │ bookstore- │◄────────│  docker compose up  │
          │              │ backend    │         │                     │
          │              │ bookstore- │         │  ┌───────────────┐  │
          │              │ frontend   │         │  │  Nginx :80    │  │
          │              └────────────┘         │  │  ┌─────────┐ │  │
          │                                     │  │  │ React   │ │  │
          │                                     │  │  │ Static  │ │  │
          │                                     │  │  └────┬────┘ │  │
          │                                     │  │       │      │  │
          │                                     │  │  Node :3001  │  │
          │                                     │  │  ┌─────────┐ │  │
          │                                     │  │  │ Express │ │  │
          │                                     │  │  └────┬────┘ │  │
          │                                     │  │       │      │  │
          │                                     │  │  SQLite Vol  │  │
          │                                     │  └───────────────┘  │
          │                                     │                     │
          └─────────────────────────────────────►  Security Group     │
                                                │  Port 80 open       │
                                                └─────────────────────┘

  USER ──► EC2 Public IP / Domain ──► Nginx ──► React SPA
                                             └──► /api/* ──► Express ──► SQLite
```

---

## Step-by-Step AWS Deployment

### Step 1 — Create AWS Resources

```bash
# 1a. Create two ECR repositories
aws ecr create-repository --repository-name bookstore-backend --region us-east-1
aws ecr create-repository --repository-name bookstore-frontend --region us-east-1

# 1b. Launch EC2 instance
#   - AMI: Amazon Linux 2023 (free tier)
#   - Type: t2.micro (free tier)
#   - Security Group: allow SSH (22) from your IP, HTTP (80) from 0.0.0.0/0
#   - Key pair: create/download a .pem file

# 1c. Connect to EC2 and install Docker
ssh -i your-key.pem ec2-user@<EC2_PUBLIC_IP>

sudo yum update -y
sudo yum install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Install AWS CLI (to pull ECR images)
sudo yum install awscli -y

# Create app directory
sudo mkdir -p /opt/bookstore
sudo chown ec2-user:ec2-user /opt/bookstore
```

### Step 2 — Create IAM User for GitHub Actions

```
1. Go to AWS IAM → Users → Create User
   Name: github-actions-bookstore

2. Attach permissions:
   - AmazonEC2ContainerRegistryFullAccess

3. Create Access Key → copy KEY_ID and SECRET

4. Also attach EC2 IAM role on the instance:
   - AmazonEC2ContainerRegistryReadOnly
   - (so EC2 can pull from ECR)
```

### Step 3 — Add GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret Name            | Value |
|------------------------|-------|
| `AWS_ACCOUNT_ID`       | Your 12-digit AWS account ID |
| `AWS_ACCESS_KEY_ID`    | IAM user access key |
| `AWS_SECRET_ACCESS_KEY`| IAM user secret key |
| `EC2_HOST`             | EC2 public IP or DNS |
| `EC2_SSH_KEY`          | Content of your .pem file |
| `JWT_SECRET`           | Random secret string (min 32 chars) |

### Step 4 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/bookstore.git
git push -u origin main
```

GitHub Actions will automatically:
1. Build the frontend and verify it compiles
2. Build Docker images and push to ECR
3. SSH into EC2 and deploy with `docker compose up -d`

### Step 5 — Verify Deployment

```bash
# Check containers are running
ssh -i your-key.pem ec2-user@<EC2_IP>
docker ps

# Test health endpoint
curl http://<EC2_IP>/health
# → {"status":"ok"}

# Open in browser
open http://<EC2_IP>
```

---

## Upgrading to Production (Optional)

For higher traffic / reliability, swap these components:

```
EC2 + SQLite  ──►  ECS Fargate + RDS PostgreSQL
                   (add POSTGRES_URL env var, swap better-sqlite3 → pg)

HTTP           ──►  HTTPS via ACM + ALB + Route 53

Single AZ      ──►  Multi-AZ RDS + ALB across 2 AZs
```

---

## CI/CD Flow Summary

```
Push to main
    │
    ├── Job 1: CI (all branches + PRs)
    │     npm ci
    │     npm run build  (catches compile errors)
    │
    ├── Job 2: Build & Push (main only)
    │     docker build backend  → ECR :sha + :latest
    │     docker build frontend → ECR :sha + :latest
    │
    └── Job 3: Deploy (main only)
          SSH to EC2
          docker pull latest images
          docker compose up -d --remove-orphans
          docker image prune -f
```
