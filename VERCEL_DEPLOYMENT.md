# Flashcards Game - Vercel Deployment Guide

## Prerequisites
- GitHub account with this repo
- Vercel account (free at vercel.com)
- MongoDB connection string (you already have this!)

## Deployment Steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: flashcards with MongoDB"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/flashcards.git
git push -u origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your flashcards repository
5. Click "Deploy"

### 3. Set Environment Variables
After project is created:
1. Go to **Settings** → **Environment Variables**
2. Add the environment variable:
   - **Name:** `MONGODB_URI`
   - **Value:** `mongodb+srv://cibap:je47X_AMXx3Awng@cluster0.ww7qelr.mongodb.net/?appName=Cluster0`
3. Click "Save"
4. Redeploy: Click "Deployments" → Latest → "Redeploy"

### 4. Test Your Deployment
Once deployed, Vercel will give you a URL like `https://flashcards-xyz.vercel.app`
- Open `/index.html` to play
- Open `/leaderboard.html` to see scores
- Scores auto-save to your MongoDB instance!

## Local Development
```bash
npm install
npm start
```
Server runs at `http://localhost:3000`

## Architecture
- **Frontend:** Static HTML/CSS/JS files
- **API:** Serverless functions in `/api` folder
  - `api/scores.js` - GET (fetch leaderboard) & POST (save score)
- **Database:** MongoDB Atlas (cloud)

## Notes
- `.env.local` has your MongoDB URI for local dev
- `.gitignore` prevents committing `.env.local`
- Vercel environment variables override local `.env.local`
- Scores persist across server restarts (stored in MongoDB)
