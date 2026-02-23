# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: f1-predictions
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to your users
5. Click "Create new project" (takes ~2 minutes)

## Step 2: Get API Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## Step 3: Configure Environment Variables

1. Open `.env.local` in your project root
2. Replace the placeholder values:
   ```env
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `database/setup.sql`
4. Paste into the SQL editor
5. Click "Run" (bottom right)
6. Verify all tables were created in **Database** → **Tables**

## Step 5: Configure Google OAuth

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Enable Google provider
4. Add your Google OAuth credentials:
   - **Client ID**: (from Google Cloud Console)
   - **Client Secret**: (from Google Cloud Console)
5. Add authorized redirect URL to your Google OAuth app:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
6. Click "Save"

### Getting Google OAuth Credentials

If you don't have them yet:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen if prompted
6. Choose **Web application**
7. Add authorized redirect URIs:
   - `http://localhost:3000` (for development)
   - `https://your-project.supabase.co/auth/v1/callback`
8. Copy Client ID and Client Secret to Supabase

## Step 6: Verify Setup

1. Restart your development server:
   ```bash
   npm start
   ```

2. Check browser console for any Supabase connection errors

3. Try signing in with Google (after we migrate the auth code)

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists in project root
- Restart your development server after adding env variables
- Check that variable names start with `REACT_APP_`

### "Invalid API key"
- Double-check you copied the **anon public** key, not the service role key
- Make sure there are no extra spaces in `.env.local`

### Google OAuth not working
- Verify redirect URL is added to both Google Console and Supabase
- Check that Google provider is enabled in Supabase
- Clear browser cookies and try again

## Next Steps

After setup is complete, we'll migrate:
1. ✅ Authentication (Google OAuth)
2. ✅ User profile management
3. ✅ League operations
4. ✅ Predictions CRUD
5. ✅ Real-time features
