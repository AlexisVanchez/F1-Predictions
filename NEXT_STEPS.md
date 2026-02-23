# 🏁 Supabase Migration - Next Steps

## What's Been Done ✅

### 1. **Supabase Setup Files Created**
- ✅ `src/config/supabase.js` - Supabase client configuration
- ✅ `.env.local` - Environment variables template
- ✅ `database/setup.sql` - Complete database schema with RLS policies
- ✅ `SUPABASE_SETUP.md` - Detailed setup instructions
- ✅ `MIGRATION_GUIDE.md` - Step-by-step migration guide

### 2. **Code Migration Completed**
- ✅ `src/redux/reducer_supabase.js` - New reducer with Supabase
  - Google OAuth authentication
  - User profile management
  - League operations (create, join, delete, search)
  - Prediction CRUD operations
  - Driver standings & schedule fetching
- ✅ `src/utils/SimulatorService.js` - Updated for Supabase

### 3. **Database Schema**
All tables created with proper:
- Foreign key relationships
- Indexes for performance
- Row Level Security (RLS) policies
- Automatic user profile creation trigger

## What You Need to Do 🎯

### Step 1: Create Supabase Project (5 minutes)

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - **Name**: f1-predictions
   - **Database Password**: (save this!)
   - **Region**: Choose closest to you
4. Wait ~2 minutes for project creation

### Step 2: Run Database Schema (2 minutes)

1. In Supabase dashboard → **SQL Editor**
2. Click "New query"
3. Copy entire contents of `database/setup.sql`
4. Paste and click "Run"
5. Verify tables created in **Database** → **Tables**

### Step 3: Configure Environment (1 minute)

1. In Supabase dashboard → **Settings** → **API**
2. Copy:
   - **Project URL**
   - **anon public** key
3. Update `.env.local`:
   ```env
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```

### Step 4: Set Up Google OAuth (5 minutes)

1. In Supabase → **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth credentials (from Google Cloud Console)
4. Add redirect URL to Google Console:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```

### Step 5: Update Your Code (3 files to change)

#### A. Update Redux Store
**File: `src/redux/store.js`** (or wherever store is configured)

```javascript
// Change this line:
import userReducer from './reducer';

// To this:
import userReducer from './reducer_supabase';
```

#### B. Update App.js Auth Listener
**File: `src/App.js`**

Replace Firebase auth listener with Supabase version (see `MIGRATION_GUIDE.md` for exact code)

#### C. Update useAchievements Hook
**File: `src/hooks/useAchievements.js`**

```javascript
// Change:
import { firestore } from "../redux/firebase_config";

// To:
import { supabase } from "../config/supabase";
```

Then update Firestore queries to Supabase format (see migration guide)

### Step 6: Test Everything (10 minutes)

```bash
npm start
```

Test:
- [ ] Sign in with Google
- [ ] Create a league
- [ ] Join a league with invite code
- [ ] Submit a prediction
- [ ] View leaderboard

## Quick Reference

### Important Files

| File | Purpose |
|------|---------|
| `SUPABASE_SETUP.md` | Detailed Supabase project setup |
| `MIGRATION_GUIDE.md` | Complete migration instructions |
| `database/setup.sql` | Database schema to run in Supabase |
| `src/redux/reducer_supabase.js` | New Supabase-compatible reducer |
| `.env.local` | Environment variables (add your keys) |

### Key Differences: Firebase vs Supabase

| Operation | Firebase | Supabase |
|-----------|----------|----------|
| **Auth** | `firebase.auth().signInWithPopup()` | `supabase.auth.signInWithOAuth()` |
| **Query** | `firestore.collection('users').where('uid', '==', id)` | `supabase.from('users').select('*').eq('id', id)` |
| **Insert** | `firestore.collection('users').add(data)` | `supabase.from('users').insert(data)` |
| **Update** | `doc.update(data)` | `supabase.from('users').update(data).eq('id', id)` |
| **Delete** | `doc.delete()` | `supabase.from('users').delete().eq('id', id)` |

## Troubleshooting

**"Missing environment variables"**
→ Restart dev server after adding `.env.local`

**"RLS policy violation"**
→ Make sure you ran the complete `database/setup.sql` script

**Google OAuth not working**
→ Check redirect URLs match in both Supabase and Google Console

## Need Help?

Check `MIGRATION_GUIDE.md` for:
- Detailed code examples
- Common issues and solutions
- Rollback plan if needed

## After Migration

Once everything works:
1. Remove Firebase: `npm uninstall firebase`
2. Delete `src/redux/firebase_config.js`
3. Delete `src/redux/reducer.js` (keep as backup first!)

---

**Estimated Total Time**: ~30 minutes

**Current Status**: Code migration complete, ready for Supabase project setup
