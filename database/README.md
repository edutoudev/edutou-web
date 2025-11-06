# Database Setup

This directory contains SQL scripts for setting up the database schema.

## Setup Profiles Table

The `setup_profiles.sql` script sets up the profiles table with all necessary triggers, functions, and indexes.

### What it includes:

1. **Trigger Functions:**
   - `update_updated_at_column()` - Automatically updates the `updated_at` timestamp
   - `initialize_leaderboard_entry()` - Initializes leaderboard points for new profiles
   - `handle_new_user()` - Automatically creates a profile when a user signs up

2. **Profiles Table:**
   - Complete schema with all columns including:
     - `id`, `email`, `full_name`, `phone`, `bio`
     - `role` (admin/mentor/student/coursemaster)
     - `points`, `leaderboard_points`
     - `created_at`, `updated_at`, `last_login_at` ⭐ NEW
     - `mentor_id`
   - Foreign key to auth.users
   - Role constraint check

3. **Indexes:**
   - idx_profiles_role
   - idx_profiles_leaderboard_points
   - idx_profiles_points
   - idx_profiles_mentor_id
   - idx_profiles_last_login_at ⭐ NEW

4. **Triggers:**
   - Auto-update timestamp on profile changes
   - Auto-initialize points on profile creation
   - Auto-create profile on user signup

5. **Row Level Security (RLS):**
   - Users can view/update their own profile
   - Public read access for leaderboards
   - Service role has full access

6. **Profile Updates on Login/Signup:** ⭐ NEW
   - **On Login**: Updates `last_login_at` timestamp and email
   - **On Signup**: Creates profile automatically via trigger, then updates with full data and `last_login_at`

## Update Existing Profiles Table to Link with Auth

If you **already have a profiles table** and want to link it with the auth.users table, use the `update_profiles_with_auth.sql` script:

### What this script does:

1. **Links profiles to auth.users:**
   - Adds foreign key constraint: `profiles.id` → `auth.users.id`
   - Enables CASCADE delete (when user is deleted, profile is deleted too)

2. **Auto-creates profiles on signup:**
   - Creates `handle_new_user()` trigger function
   - Trigger runs automatically when new user signs up in auth.users
   - Profile is created with default role 'student'

3. **Adds missing features:**
   - Adds `last_login_at` column if missing
   - Creates all necessary indexes
   - Sets up Row Level Security (RLS) policies
   - Grants proper permissions

4. **Safe to run multiple times:**
   - Checks if constraints/columns exist before adding
   - Won't break existing data

### How to Run:

#### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `update_profiles_with_auth.sql`
4. Click "Run"

#### Option 2: Using psql
```bash
psql -h 172.105.252.86 -p 8000 -U postgres -d postgres < database/update_profiles_with_auth.sql
```

---

## Full Setup (New Database)

### How to Run:

#### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `setup_profiles.sql`
4. Click "Run"

#### Option 2: Using Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db reset
# Or run the migration directly
psql $DATABASE_URL < database/setup_profiles.sql
```

#### Option 3: Using psql directly
```bash
psql -h 172.105.252.86 -p 8000 -d postgres -U postgres < database/setup_profiles.sql
```

### Verification

After running the script, verify the setup:

```sql
-- Check if profiles table exists
SELECT * FROM information_schema.tables WHERE table_name = 'profiles';

-- Check if triggers exist
SELECT * FROM information_schema.triggers WHERE trigger_name LIKE '%profiles%';

-- Check if functions exist
SELECT * FROM pg_proc WHERE proname IN ('update_updated_at_column', 'initialize_leaderboard_entry', 'handle_new_user');
```

### Testing

Try creating a new user through the signup flow. The trigger should automatically create a profile with:
- Default role: 'student'
- Default points: 0
- Default leaderboard_points: 0
- Timestamps set to current time
- last_login_at set to signup time

## Migration: Add last_login_at to Existing Database

If you already have a profiles table and just want to add the `last_login_at` column, use the `add_last_login_column.sql` script:

### How to Run the Migration:

#### Using Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `add_last_login_column.sql`
4. Click "Run"

#### Using psql:
```bash
psql -h 172.105.252.86 -p 8000 -U postgres -d postgres < database/add_last_login_column.sql
```

This migration script:
- Safely adds the `last_login_at` column (checks if it exists first)
- Creates the necessary index
- Verifies the column was added successfully

## Profile Update Behavior

### On User Login:
The login action (`app/login/actions.ts:login`) will:
1. Authenticate the user
2. Update the profile with:
   - `last_login_at`: Current timestamp
   - `email`: User's current email (in case it changed)
3. Fetch and return the user's role for proper redirect

### On User Signup:
The signup action (`app/login/actions.ts:signup`) will:
1. Create the auth user
2. Database trigger automatically creates profile entry
3. Update the profile with:
   - `full_name`: From signup form
   - `email`: From signup form
   - `last_login_at`: Current timestamp (first login)
4. Fetch and return the user's role for proper redirect

### Fallback Handling:
Both login and signup have robust error handling:
- If profile doesn't exist on login, it will be created automatically
- If profile update fails, the system falls back to fetching existing data
- Default role is always 'student' for new profiles
