# Migration Steps from Firebase to Supabase

This guide walks you through the complete migration process.

## Prerequisites

✅ Supabase dependencies installed (`@supabase/supabase-js`)
✅ Database schema created (`database/setup.sql`)
✅ Environment variables configured (`.env.local`)

## Step 1: Set Up Supabase Project

Follow the instructions in `SUPABASE_SETUP.md` to:
1. Create your Supabase project
2. Run the database schema
3. Configure Google OAuth
4. Set environment variables

## Step 2: Switch to Supabase Reducer

The new Supabase-compatible reducer has been created at `src/redux/reducer_supabase.js`.

### Update Store Configuration

**File: `src/redux/store.js`** (or wherever your Redux store is configured)

```javascript
// Before
import userReducer from './reducer';

// After
import userReducer from './reducer_supabase';
```

## Step 3: Update Auth State Listener

Supabase uses a different auth state listener than Firebase.

**File: `src/App.js`** (or your main app component)

### Before (Firebase):
```javascript
import { auth } from './redux/firebase_config';

useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    if (user) {
      // Handle user
    }
  });
  return unsubscribe;
}, []);
```

### After (Supabase):
```javascript
import { supabase } from './config/supabase';
import { fetchUserProfile } from './redux/reducer_supabase';

useEffect(() => {
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      dispatch(fetchUserProfile(session.user.id));
    }
  });

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        dispatch(fetchUserProfile(session.user.id));
      } else if (event === 'SIGNED_OUT') {
        dispatch(clearUser());
      }
    }
  );

  return () => subscription.unsubscribe();
}, [dispatch]);
```

## Step 4: Update useAchievements Hook

**File: `src/hooks/useAchievements.js`**

Replace Firebase imports:

```javascript
// Before
import { firestore } from "../redux/firebase_config";

// After
import { supabase } from "../config/supabase";
```

Update Firestore queries to Supabase:

```javascript
// Before
const snapshot = await firestore
  .collection('predictions')
  .where('uid', '==', userId)
  .get();

// After
const { data, error } = await supabase
  .from('predictions')
  .select('*')
  .eq('user_id', userId);
```

## Step 5: Test the Migration

### 5.1 Start Development Server

```bash
npm start
```

### 5.2 Test Authentication

1. Click "Sign in with Google"
2. Verify you're redirected to Google OAuth
3. After signing in, check:
   - User profile is created in Supabase `users` table
   - Redux state is populated with user data
   - No console errors

### 5.3 Test Core Features

- **Create a league**: Verify it appears in `leagues` and `league_members` tables
- **Join a league**: Use invite code, check membership
- **Submit predictions**: Verify in `predictions` table
- **View leaderboard**: Check data loads correctly

## Step 6: Data Migration (If You Have Existing Data)

If you have existing Firebase data to migrate:

### Option A: Manual Export/Import (Small Dataset)

1. Export data from Firebase Console
2. Transform to match Supabase schema
3. Import via Supabase dashboard or SQL

### Option B: Migration Script (Recommended)

Create a Node.js script to migrate data:

```javascript
// scripts/migrate-firebase-to-supabase.js
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert('./firebase-admin-key.json')
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrateUsers() {
  const snapshot = await admin.firestore().collection('users').get();
  const users = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      email: data.email,
      display_name: data.displayName,
      photo_url: data.photoURL,
      global_points: data.globalPoints || 0,
      global_rank: data.globalRank || 0,
      created_at: data.createdAt?.toDate(),
      last_seen: data.lastSeen?.toDate()
    };
  });
  
  const { error } = await supabase.from('users').insert(users);
  if (error) console.error('Users migration error:', error);
  else console.log(`Migrated ${users.length} users`);
}

// Run migrations
migrateUsers()
  .then(() => console.log('Migration complete'))
  .catch(console.error);
```

## Step 7: Remove Firebase Dependencies

Once everything is working:

### 7.1 Update package.json

```bash
npm uninstall firebase
```

### 7.2 Delete Firebase Files

```bash
rm src/redux/firebase_config.js
rm src/redux/reducer.js  # Keep as backup until fully tested
```

### 7.3 Update .gitignore

Remove Firebase-specific entries, add:
```
.env.local
```

## Step 8: Deploy

### Update Environment Variables in Production

Add to your hosting platform (Vercel, Netlify, etc.):
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

### Update OAuth Redirect URLs

Add your production URL to:
1. Supabase Auth settings
2. Google Cloud Console OAuth credentials

## Rollback Plan

If you encounter issues:

1. **Revert reducer**: Change `store.js` back to `./reducer`
2. **Keep Firebase running**: Don't uninstall until fully tested
3. **Parallel run**: Run both systems temporarily

## Verification Checklist

- [ ] Supabase project created and configured
- [ ] Database schema applied successfully
- [ ] Google OAuth working
- [ ] User can sign in/out
- [ ] User profile created automatically
- [ ] Leagues can be created and joined
- [ ] Predictions can be saved and fetched
- [ ] No console errors
- [ ] All existing features working
- [ ] Performance is acceptable
- [ ] Data migrated (if applicable)

## Need Help?

Common issues and solutions:

**"Missing environment variables"**
- Restart dev server after adding `.env.local`
- Check variable names start with `REACT_APP_`

**"Row Level Security policy violation"**
- Verify RLS policies are created in Supabase
- Check user is authenticated before operations

**"Foreign key constraint violation"**
- Ensure user profile exists before creating related records
- Check the `handle_new_user()` trigger is working

**"OAuth redirect mismatch"**
- Verify redirect URLs match exactly in both Supabase and Google Console
- Include protocol (http/https) and port for localhost
