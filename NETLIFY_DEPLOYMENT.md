# Netlify Deployment Guide

## Prerequisites

1. **Database**: Netlify doesn't provide built-in PostgreSQL. You'll need to use an external provider:
   - Supabase (recommended - free tier available)
   - Neon (serverless PostgreSQL)
   - Railway
   - Any other PostgreSQL hosting service

2. **Clerk Authentication**: You need a Clerk account at https://dashboard.clerk.com

## Setup Steps

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables in Netlify

Go to your Netlify dashboard → Site settings → Environment variables and add:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
NODE_ENV=production
LOG_LEVEL=info
```

### 3. Deploy to Netlify

Option A: Via Git (recommended)
- Push your code to GitHub/GitLab/Bitbucket
- Connect your repository in Netlify
- Netlify will automatically deploy using the `netlify.toml` configuration

Option B: Via Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

## Database Setup

### Using Supabase (Recommended)

1. Create a free account at https://supabase.com
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string (use "URI" format)
5. Use this as your `DATABASE_URL` environment variable

### Using Neon

1. Create an account at https://neon.tech
2. Create a new project
3. Copy the connection string
4. Use this as your `DATABASE_URL` environment variable

## Clerk Setup

1. Create an account at https://dashboard.clerk.com
2. Create a new application
3. Enable "Email/Password" and "Google" authentication methods
4. Copy your keys from the dashboard:
   - `CLERK_SECRET_KEY` - from API Keys section
   - `CLERK_PUBLISHABLE_KEY` - from API Keys section
   - `VITE_CLERK_PUBLISHABLE_KEY` - same as CLERK_PUBLISHABLE_KEY

## Architecture

- **Frontend**: Built with Vite, deployed to Netlify CDN
- **Backend**: Express API converted to Netlify Functions using `serverless-http`
- **Database**: External PostgreSQL (Supabase/Neon/etc)
- **Auth**: Clerk authentication

## Troubleshooting

### Build Errors
- Ensure all dependencies are installed: `pnpm install`
- Check that Node.js version 24 is set in Netlify site settings

### Database Connection Errors
- Verify your `DATABASE_URL` is correct
- Ensure your database provider allows connections from Netlify's IP ranges
- Check that the database is accessible (not in a private VPC without proper access)

### Authentication Issues
- Verify Clerk keys are correctly set in environment variables
- Ensure your Clerk application allows your Netlify domain as an allowed origin
