# StockVision Pro - Deployment Guide

## Overview
This guide explains how to deploy StockVision Pro to production using Vercel for the frontend and Render for the backend.

## Prerequisites
1. Accounts on [Vercel](https://vercel.com) and [Render](https://render.com)
2. MongoDB Atlas account (free tier available)
3. GitHub repository with the code

## Backend Deployment (Render)

### 1. Prepare Environment Variables
Create a `.env` file in the backend directory with:
```env
# Database - Use PostgreSQL for production on Render
DATABASE_URL=postgresql://user:password@host:port/database

# MongoDB (required for news sentiment, user analytics)
MONGODB_URI=mongodb+srv://your-cluster.mongodb.net/stockvision

# Authentication & Security
JWT_SECRET_KEY=your_32_byte_secret_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# App config
ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app
PRICE_REFRESH_SECONDS=10
```

### 2. Deploy to Render
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set the build command to: `pip install -r requirements.txt`
4. Set the start command to: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add the environment variables from your `.env` file
6. Deploy!

### 3. Database Setup
Render provides a free PostgreSQL instance:
1. In your Render dashboard, add a PostgreSQL database
2. Note the connection string provided
3. Update the DATABASE_URL environment variable with this connection string
4. Redeploy the backend

## Frontend Deployment (Vercel)

### 1. Prepare Environment Variables
In your Vercel project settings, add:
```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_APP_TITLE=StockVision Pro
```

### 2. Deploy to Vercel
1. Import your GitHub repository to Vercel
2. Vercel will automatically detect it's a Vite project
3. Add the environment variables above
4. Deploy!

## Important Notes

### WebSocket Fallback
The frontend implements a WebSocket connection with automatic fallback to polling:
- Attempts WebSocket connection to `/ws/prices`
- Falls back to HTTP polling every 15 seconds if WebSocket fails
- Works reliably on Render's free tier

### MongoDB Requirement
MongoDB is required for:
- Market news sentiment analysis
- User analytics and preferences
- You can use MongoDB Atlas free tier

### Environment Variables
Never commit `.env` files to GitHub! Use the platform's secret management:
- Render: Environment → Environment Variables
- Vercel: Project Settings → Environment Variables

### Health Checks
Both platforms will automatically check:
- Backend: `/health` endpoint
- Frontend: Root URL serves `index.html`

## Troubleshooting

### WebSocket Not Connecting
1. Check backend logs for WebSocket endpoint errors
2. Verify CORS settings allow your frontend domain
3. The frontend will automatically fall back to polling

### Database Connection Issues
1. Verify PostgreSQL connection string format
2. Check if MongoDB URI is correctly formatted
3. Ensure network access is allowed (for MongoDB Atlas)

### 404 Errors on Routes
1. Ensure Vercel is configured as a Vite project
2. Check that `vercel.json` is present in frontend directory
3. Verify build output goes to `dist/` directory

## Maintenance
- Monitor logs in both Render and Vercel dashboards
- Set up alerts for high error rates or slow response times
- Regularly update dependencies (`npm update`, `pip list --outdated`)
- Backup MongoDB data periodically

## Support
For issues, check:
1. Backend logs in Render dashboard
2. Frontend logs in Vercel dashboard
3. Browser developer tools for frontend errors
4. Network tab to verify API calls are succeeding