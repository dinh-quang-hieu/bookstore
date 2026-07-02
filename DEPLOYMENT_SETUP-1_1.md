# 🚀 Detailed AWS + GitHub Actions Setup Guide

This guide will walk you through **every single step** needed to get your app deployed from GitHub to AWS EC2.

---

## Phase 1: Create AWS Resources

### Step 1.1 — Create ECR Repositories

**What:** Two private Docker registries to store your images

1. Go to **AWS Console** → Search **"ECR"** → Click **Elastic Container Registry**

2. Click **Create Repository**
   - Repository name: `bookstore-backend`
   - Visibility: **Private**
   - Click **Create Repository**

3. Note the URI (looks like): `123456789012.dkr.ecr.us-east-1.amazonaws.com/bookstore-backend`
   - Save this somewhere — you'll need it

4. **Repeat** for `bookstore-frontend`

**Result:** Two ECR repos created ✓

---

### Step 1.2 — Create EC2 Instance

**What:** Virtual machine to run your Docker containers

1. Go to **AWS Console** → Search **"EC2"** → Click **Instances**

2. Click **Launch Instance**

3. **Configure:**
   - **Name:** `bookstore-app`
   - **AMI:** "Amazon Linux 2023" (free tier eligible)
   - **Instance Type:** `t2.micro` (free tier)
   - **Key Pair:** 
     - Click **Create new key pair**
     - Name: `bookstore-key`
     - Type: RSA
     - Format: `.pem` (macOS/Linux) or `.ppk` (Windows PuTTY)
     - Click **Create key pair** → saves to Downloads
   - **Storage:** 25 GB (default, free tier)
   - **Security Group:** Click **Create security group**
     - Name: `bookstore-sg`
     - Description: "BookStore App"
     - **Add these rules:**
       
       | Type    | Protocol | Port | Source       | Purpose |
       |---------|----------|------|------|---------|
       | SSH     | TCP      | 22   | 0.0.0.0/0    | Connect from anywhere |
       | HTTP    | TCP      | 80   | 0.0.0.0/0    | Public web access |
       | HTTPS   | TCP      | 443  | 0.0.0.0/0    | (optional, for future) |

   - Click **Launch Instance**

4. **Wait ~2 minutes** for instance to be "Running"

5. Note the **Public IPv4 address** (e.g., `54.123.45.67`) — save this

**Result:** EC2 instance running ✓

---

### Step 1.3 — Connect to EC2 & Install Docker

**What:** SSH into your instance and install Docker + Docker Compose

#### On Windows (PowerShell)

```powershell
# 1. First, make sure your key file is in a safe location
#    Download bookstore-key.pem → C:\Users\YourUsername\keys\bookstore-key.pem

# 2. Fix permissions (Windows)
icacls "C:\Users\YourUsername\keys\bookstore-key.pem" /inheritance:r

# 3. SSH into EC2
$EC2_IP = "54.123.45.67"  # Replace with your actual IP
ssh -i "C:\Users\YourUsername\keys\bookstore-key.pem" ec2-user@$EC2_IP

# You should see: [ec2-user@ip-... ~]$
```

#### On macOS/Linux

```bash
# 1. Fix key permissions
chmod 400 ~/Downloads/bookstore-key.pem

# 2. SSH into EC2
ssh -i ~/Downloads/bookstore-key.pem ec2-user@54.123.45.67
```

---

#### Once Connected to EC2

```bash
# 1. Update system
sudo yum update -y

# 2. Install Docker
sudo yum install docker -y
sudo systemctl start docker
sudo systemctl enable docker

# 3. Add ec2-user to docker group (so no sudo needed)
sudo usermod -aG docker ec2-user
newgrp docker

# 4. Verify Docker works
docker --version
# Should show: Docker version 24.x.x

# 5. Install Docker Compose
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# 6. Verify Docker Compose
docker compose --version
# Should show: Docker Compose version 2.x.x

# 7. Install AWS CLI (to pull from ECR)
sudo yum install awscli -y

# 8. Create app directory
sudo mkdir -p /opt/bookstore
sudo chown ec2-user:ec2-user /opt/bookstore

echo "✓ EC2 setup complete!"
exit  # Disconnect from EC2
```

**Result:** EC2 has Docker + Compose ready ✓

---

## Phase 2: Create IAM User for GitHub Actions

**What:** AWS credentials for GitHub to push images to ECR and deploy to EC2

### Step 2.1 — Create IAM User

1. Go to **AWS Console** → Search **"IAM"** → Click **Users**

2. Click **Create User**
   - Username: `github-actions-bookstore`
   - Click **Create User**

3. Click on the new user → Go to **Security Credentials** tab

4. Click **Create Access Key**
   - Use case: **Application running outside AWS**
   - Click **Create access key**
   - Copy and save:
     - `Access Key ID` (looks like: `AKIA5XXXXXXXXX`)
     - `Secret Access Key` (looks like: `wJal/XXXXXX/XXXXX`)
     - ⚠️ **Save these safely — you'll only see them once!**

### Step 2.2 — Attach Permissions

1. Go back to the user → **Add permissions** → **Attach policies directly**

2. Search and check these policies:
   - ✓ `AmazonEC2ContainerRegistryFullAccess` (push/pull images)
   - ✓ `AmazonSSMPatchAssociation` (for SSH via Systems Manager)

3. Click **Add permissions**

**Result:** IAM user created with ECR access ✓

---

### Step 2.3 — Add IAM Role to EC2 (so EC2 can pull from ECR)

1. Go to **AWS Console** → **EC2** → **Instances** → Select your instance

2. Click **Security** tab → Click the **IAM role** link

3. Click **Create role**
   - **Trusted entity type:** AWS service
   - **Service:** EC2
   - Click **Next**

4. Search and add policy:
   - ✓ `AmazonEC2ContainerRegistryReadOnly`
   - Click **Next**

5. **Role name:** `ec2-ecr-read`
   - Click **Create role**

6. Attach to instance:
   - Go back to EC2 instance
   - Right-click → **Security** → **Modify IAM role**
   - Select `ec2-ecr-read`
   - Click **Update IAM role**

**Result:** EC2 can pull from ECR ✓

---

## Phase 3: Configure GitHub Secrets

**What:** Store AWS credentials + config in GitHub so the workflow can use them

### Step 3.1 — Get Your AWS Account ID

```bash
# From any AWS Console page, click top-right corner
# Your AWS Account ID is shown (12 digits)
# Or run from AWS CLI:
aws sts get-caller-identity --query Account --output text
# Output: 123456789012
```

### Step 3.2 — Add Secrets to GitHub

1. Open your GitHub repo → **Settings** → **Secrets and variables** → **Actions**

2. Click **New repository secret** and add these one by one:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID | `123456789012` |
| `AWS_ACCESS_KEY_ID` | From IAM user (Step 2.1) | `AKIA5XXXXXXXXX` |
| `AWS_SECRET_ACCESS_KEY` | From IAM user (Step 2.1) | `wJal/XXXXXX/XXXXX` |
| `EC2_HOST` | EC2 Public IP address | `54.123.45.67` |
| `EC2_SSH_KEY` | Content of `bookstore-key.pem` file | (entire file text) |
| `JWT_SECRET` | Random secret string (32+ chars) | `your-super-secret-key-min-32-chars-12345` |

**How to add EC2_SSH_KEY:**
```bash
# On your local machine:
cat ~/Downloads/bookstore-key.pem
# Copy entire output → paste into GitHub secret
```

**How to generate JWT_SECRET:**
```bash
# Linux/macOS:
openssl rand -base64 32

# Windows PowerShell:
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Or just create a random string: e.g.,
# "super-secret-jwt-key-change-this-in-prod-12345678"
```

**Result:** All secrets stored in GitHub ✓

---

## Phase 4: Verify Everything Works

### Step 4.1 — Test GitHub Secrets

1. In GitHub repo, go to **Settings** → **Secrets and variables** → **Actions**
2. Verify all 6 secrets are listed (values hidden)

### Step 4.2 — Test EC2 Connection

SSH into EC2 again to verify Docker is running:

```bash
ssh -i ~/Downloads/bookstore-key.pem ec2-user@54.123.45.67

# Once connected:
docker ps
docker compose --version
aws --version

# Should all work without errors
exit
```

### Step 4.3 — Push Code to GitHub & Watch the Workflow

```bash
# From your local machine:
cd demo_webapp
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/bookstore.git
git branch -M main
git push -u origin main
```

1. Go to **GitHub repo** → **Actions** tab
2. Watch the workflow run:
   - 🟡 Job 1: Test (should show npm installing)
   - 🟡 Job 2: Build & Push (should build Docker images)
   - 🟡 Job 3: Deploy (should SSH to EC2 and run docker compose)

3. Check status of each job by clicking on them

### Step 4.4 — Verify App is Running

```bash
# Open browser and visit:
http://54.123.45.67

# You should see the BookStore app!
# Try logging in with: admin@bookstore.com / admin123
```

**Result:** Full CI/CD pipeline working! ✓

---

## Phase 5: Troubleshooting

### Problem: Job 2 fails — "Could not find any Visual Studio installation"

**Cause:** You're building Docker images locally on Windows (not in CI)

**Solution:** Use Docker Desktop or just push to GitHub:
```bash
git push origin main
# Let GitHub Actions build (it uses Linux)
```

---

### Problem: Job 3 fails — "Permission denied (publickey)"

**Cause:** EC2_SSH_KEY secret is incorrect or has wrong formatting

**Solution:**
```bash
# Verify your key:
cat ~/Downloads/bookstore-key.pem | head -1
# Should show: -----BEGIN RSA PRIVATE KEY-----

# Copy entire file (including BEGIN/END lines):
cat ~/Downloads/bookstore-key.pem | pbcopy  # macOS
cat ~/Downloads/bookstore-key.pem | xclip   # Linux
# Then paste into GitHub secret
```

---

### Problem: Job 3 fails — "docker: command not found"

**Cause:** EC2 doesn't have Docker installed

**Solution:** SSH into EC2 and run Step 1.3 commands again

---

### Problem: Docker images stuck or not updating

**Solution:**
```bash
# SSH into EC2
ssh -i ~/bookstore-key.pem ec2-user@YOUR_IP

# Manually pull and restart:
docker compose -f /opt/bookstore/docker-compose.prod.yml down
docker pull 123456789012.dkr.ecr.us-east-1.amazonaws.com/bookstore-backend:latest
docker pull 123456789012.dkr.ecr.us-east-1.amazonaws.com/bookstore-frontend:latest
docker compose -f /opt/bookstore/docker-compose.prod.yml up -d

# Check logs:
docker logs bookstore-backend
docker logs bookstore-frontend
```

---

## Phase 6: Make Your First Update

Test the full CI/CD pipeline:

```bash
# 1. Make a code change
# Edit: backend/src/routes/books.js or frontend/src/pages/BookStore.jsx

# 2. Commit and push
git add .
git commit -m "Update: change book price"
git push origin main

# 3. Watch GitHub Actions
# Go to repo → Actions → watch the workflow

# 4. Within ~2 minutes, your app is updated!
# Visit http://EC2_IP and refresh to see changes
```

---

## Checklist: Before You Start

- [ ] AWS account created (free tier eligible)
- [ ] Downloaded `bookstore-key.pem` and saved safely
- [ ] Have your AWS Account ID (12 digits)
- [ ] GitHub repo is ready (git init, files committed)
- [ ] AWS CLI installed locally (optional but helpful)

---

## Commands Reference Sheet

```bash
# Test SSH connection
ssh -i ~/bookstore-key.pem ec2-user@EC2_IP

# Check running containers
docker ps

# View logs
docker logs bookstore-backend
docker logs bookstore-frontend

# Restart containers
docker compose -f /opt/bookstore/docker-compose.prod.yml restart

# View GitHub workflow logs
# GitHub → repo → Actions → click workflow → click job

# Login to ECR (from EC2)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
```

---

**You're all set! 🚀 The app will now auto-deploy every time you push to `main`.**
