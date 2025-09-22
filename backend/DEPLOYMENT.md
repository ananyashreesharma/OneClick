# 🚀 OneClickNotes Backend Deployment Guide

Complete guide to deploy your OneClickNotes backend API on free tier hosting platforms.

## 🎯 Deployment Options

### 1. **Render** (Recommended - Free Tier)
- **Free**: 750 hours/month
- **Auto-deploy** from GitHub
- **Custom domains** supported
- **SSL certificates** included

### 2. **Railway** (Alternative - Free Tier)
- **Free**: $5 credit/month
- **One-click deployment**
- **Auto-scaling**
- **Built-in monitoring**

### 3. **Fly.io** (Advanced - Free Tier)
- **Free**: 3 shared-cpu-1x 256mb VMs
- **Global edge deployment**
- **Docker-based**
- **CLI deployment**

## 🚀 Render Deployment (Step-by-Step)

### Step 1: Prepare Your Repository
1. **Push your backend code** to GitHub
2. **Ensure all files are committed**:
   ```bash
   git add .
   git commit -m "Add complete backend API"
   git push origin main
   ```

### Step 2: Create Render Account
1. Go to [render.com](https://render.com)
2. **Sign up** with GitHub account
3. **Verify email** address

### Step 3: Create New Web Service
1. **Click "New +"** → **"Web Service"**
2. **Connect your GitHub repository**
3. **Select the repository** with your backend code

### Step 4: Configure Service
```yaml
Name: oneclicknotes-api
Environment: Node
Region: Choose closest to you
Branch: main
Root Directory: backend (if backend is in subfolder)
Build Command: npm install
Start Command: npm start
```

### Step 5: Set Environment Variables
Click **"Environment"** tab and add:

```bash
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secure-jwt-secret-here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/oneclicknotes
FRONTEND_URL=https://your-frontend-domain.com
```

### Step 6: Deploy
1. **Click "Create Web Service"**
2. **Wait for build** (usually 2-5 minutes)
3. **Get your API URL**: `https://your-service-name.onrender.com`

## 🚂 Railway Deployment

### Step 1: Railway Setup
1. Go to [railway.app](https://railway.app)
2. **Sign in** with GitHub
3. **Click "New Project"**

### Step 2: Import Repository
1. **Select "Deploy from GitHub repo"**
2. **Choose your repository**
3. **Set root directory** to `backend`

### Step 3: Configure Service
1. **Add environment variables** (same as Render)
2. **Set build command**: `npm install`
3. **Set start command**: `npm start`

### Step 4: Deploy
1. **Click "Deploy Now"**
2. **Wait for deployment**
3. **Get your API URL** from Railway dashboard

## 🪰 Fly.io Deployment

### Step 1: Install Fly CLI
```bash
# macOS
brew install flyctl

# Windows
iwr https://fly.io/install.ps1 -useb | iex

# Linux
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login & Setup
```bash
fly auth login
fly auth signup  # if you don't have account
```

### Step 3: Create App
```bash
cd backend
fly launch
```

### Step 4: Configure fly.toml
```toml
[env]
  NODE_ENV = "production"
  PORT = "8080"
  JWT_SECRET = "your-secret"
  MONGODB_URI = "your-mongodb-uri"
  FRONTEND_URL = "your-frontend-url"
```

### Step 5: Deploy
```bash
fly deploy
```

## 🗄️ MongoDB Atlas Setup

### Step 1: Create Atlas Account
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. **Sign up** for free account
3. **Create new project**

### Step 2: Create Cluster
1. **Click "Build a Database"**
2. **Choose "FREE" tier** (M0)
3. **Select cloud provider** (AWS, Google Cloud, Azure)
4. **Choose region** (closest to your deployment)
5. **Click "Create"**

### Step 3: Database Access
1. **Go to "Database Access"**
2. **Click "Add New Database User"**
3. **Username**: `oneclicknotes_user`
4. **Password**: Generate secure password
5. **Role**: "Read and write to any database"
6. **Click "Add User"**

### Step 4: Network Access
1. **Go to "Network Access"**
2. **Click "Add IP Address"**
3. **Click "Allow Access from Anywhere"** (for development)
4. **Click "Confirm"**

### Step 5: Get Connection String
1. **Go to "Database"**
2. **Click "Connect"**
3. **Choose "Connect your application"**
4. **Copy connection string**
5. **Replace `<password>` with your user password**

## 🔧 Environment Variables

### Required Variables
```bash
# Server
NODE_ENV=production
PORT=10000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/oneclicknotes

# Security
JWT_SECRET=your-super-secure-jwt-secret-here

# Frontend
FRONTEND_URL=https://your-frontend-domain.com
```

### Optional Variables
```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Uploads
MAX_FILE_SIZE=10485760
MAX_FILES_PER_REQUEST=1

# Security
BCRYPT_SALT_ROUNDS=12
JWT_EXPIRES_IN=30d
```

## 📱 Frontend Integration

### Update API Base URL
In your React Native app, update the API configuration:

```javascript
// config/api.js
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000'  // Development
  : 'https://your-api-domain.com'; // Production

export const API_ENDPOINTS = {
  AUTH: `${API_BASE_URL}/api/auth`,
  NOTES: `${API_BASE_URL}/api/notes`,
  UPLOADS: `${API_BASE_URL}/uploads`
};
```

### Test API Connection
```javascript
// Test your deployed API
fetch('https://your-api-domain.com/health')
  .then(response => response.json())
  .then(data => console.log('API Status:', data));
```

## 🔍 Post-Deployment Testing

### 1. Health Check
```bash
curl https://your-api-domain.com/health
```

### 2. Test Authentication
```bash
# Register user
curl -X POST https://your-api-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Test Notes API
```bash
# Get notes (requires auth token)
curl -X GET https://your-api-domain.com/api/notes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🚨 Common Deployment Issues

### Build Failures
```bash
# Check build logs in deployment platform
# Common issues:
# - Missing dependencies in package.json
# - Wrong start command
# - Environment variables not set
```

### Runtime Errors
```bash
# Check application logs
# Common issues:
# - MongoDB connection failed
# - JWT_SECRET not set
# - Port conflicts
```

### CORS Issues
```bash
# Ensure FRONTEND_URL is set correctly
# Check CORS configuration in server.js
# Verify frontend domain matches
```

## 📊 Monitoring & Maintenance

### Health Monitoring
- **Render**: Built-in monitoring dashboard
- **Railway**: Real-time logs and metrics
- **Fly.io**: CLI-based monitoring

### Logs
```bash
# View application logs
# Render: Dashboard → Logs tab
# Railway: Deployments → View logs
# Fly.io: fly logs
```

### Performance
- **Response times**: Monitor API response times
- **Error rates**: Track 4xx/5xx errors
- **Database performance**: MongoDB Atlas metrics

## 🔒 Security Checklist

- [ ] **JWT_SECRET** is strong and unique
- [ ] **MONGODB_URI** uses authentication
- [ ] **CORS** is properly configured
- [ ] **Rate limiting** is enabled
- [ ] **Environment variables** are secure
- [ ] **HTTPS** is enabled (automatic on most platforms)

## 💰 Cost Optimization

### Free Tier Limits
- **Render**: 750 hours/month
- **Railway**: $5 credit/month
- **Fly.io**: 3 shared VMs

### Upgrade When Needed
- **More traffic**: Upgrade to paid plans
- **Better performance**: Choose higher tiers
- **Custom domains**: Usually included in paid plans

## 🎉 Success!

Your OneClickNotes backend is now deployed and ready to serve your mobile app!

### Next Steps
1. **Test all API endpoints**
2. **Update frontend configuration**
3. **Monitor performance**
4. **Set up custom domain** (optional)
5. **Configure monitoring alerts**

---

**Happy Deploying! 🚀**
