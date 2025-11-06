# Quick Start Guide - Profiles Table Setup

## Problem
Your profiles table needs to be properly linked with Supabase auth.users table so that:
- UUIDs in profiles come from auth.users
- Profiles are automatically created when users sign up
- Profiles are deleted when users are deleted

## Solution

Run the `update_profiles_with_auth.sql` script in your Supabase SQL Editor.

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
Go to: http://172.105.252.86:8000/

### 2. Navigate to SQL Editor
- Click on "SQL Editor" in the left sidebar
- Click "New Query"

### 3. Copy the Script
Open the file: `database/update_profiles_with_auth.sql`
Copy all the contents

### 4. Paste and Run
- Paste the script into the SQL Editor
- Click the "Run" button (or press Cmd/Ctrl + Enter)

### 5. Verify Success
You should see output showing:
```
✅ Functions created
✅ Foreign key constraint added
✅ Triggers created
✅ Indexes created
✅ RLS policies created
```

## What This Does

### Before:
```
auth.users          profiles
┌──────────┐        ┌──────────┐
│ id (uuid)│        │ id (uuid)│  ← No connection!
│ email    │        │ email    │
└──────────┘        └──────────┘
```

### After:
```
auth.users          profiles
┌──────────┐        ┌──────────┐
│ id (uuid)│───────▶│ id (uuid)│  ← Foreign key!
│ email    │   FK   │ email    │
└──────────┘        └──────────┘
     │
     │ When user signs up...
     │
     ▼
  Trigger automatically creates profile ✨
```

## What Happens Now

### When a user signs up:
1. User account created in `auth.users` ✅
2. **Trigger automatically creates profile in `profiles`** ✅
3. Profile has:
   - Same `id` as auth user
   - Email from auth user
   - Default role: 'student'
   - `last_login_at` set to now
   - Points initialized to 0

### When a user is deleted:
1. User deleted from `auth.users`
2. **Profile automatically deleted from `profiles`** (CASCADE) ✅

### When a user logs in:
1. Your app updates `last_login_at` in profile ✅
2. Email synced if changed ✅

## Testing

After running the script, test it:

### 1. Create a test user
```sql
-- In SQL Editor, run:
SELECT auth.uid(); -- Check if you're logged in
```

### 2. Check if trigger works
Try signing up a new user through your app's signup form.
Then check:
```sql
SELECT * FROM profiles ORDER BY created_at DESC LIMIT 5;
```

You should see the new profile automatically created!

### 3. Verify foreign key
```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'profiles';
```

Should return: `profiles.id` → `auth.users.id`

## Troubleshooting

### Error: "violates foreign key constraint"
**Problem**: You have profiles with IDs that don't exist in auth.users

**Solution**: Clean up orphaned profiles:
```sql
-- Find orphaned profiles
SELECT p.id, p.email
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- Delete them (if safe to do so)
DELETE FROM profiles
WHERE id NOT IN (SELECT id FROM auth.users);
```

### Error: "already exists"
**Problem**: Constraint/trigger already exists

**Solution**: This is fine! The script is idempotent and will skip existing items.

### Trigger not working
**Problem**: New users sign up but no profile is created

**Solution**: Check if trigger exists:
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

If missing, re-run the script.

## Need Help?

Check the full documentation in `database/README.md`
