# Complete Database Setup Guide for Edutou

This guide walks you through setting up all the required database tables and storage for the Edutou platform.

## Prerequisites

1. A Supabase project created
2. Access to the Supabase SQL Editor
3. Access to the Supabase Storage section

## 🚀 Quick Setup (Run These in Order)

### Step 1: Core Tables (Profiles) ✅
**File**: `FRESH_START.sql`

This sets up the core `profiles` table that stores user information. This table is referenced by many other tables, so it must be created first.

**What it creates**:
- `profiles` table with user information
- RLS policies for data security
- Basic indexes for performance

### Step 2: Points/Gamification System 🎮
**File**: `setup_points_system.sql`

This creates the points and rewards system for gamifying the learning experience.

**What it creates**:
- `points_config` table - point values for different actions
- `points_history` table - transaction history
- Database functions: `award_points()`, `adjust_points_manual()`, `get_user_total_points()`
- Default point configurations

### Step 3: Discussions Forum 💬
**File**: `setup_discussions.sql`

This creates the discussion forum functionality.

**What it creates**:
- `discussions` table - discussion threads
- `discussion_comments` table - comments on discussions
- `discussion_votes` table - upvote/downvote tracking
- Automatic vote counting triggers
- RLS policies for security

### Step 4: Notifications System 🔔
**File**: `setup_notifications.sql`

This creates the notification system for admins and mentors to communicate with students.

**What it creates**:
- `notifications` table - notification messages
- `user_notifications` table - tracks read/unread status per user
- Database functions for notification management
- Automatic broadcasting triggers
- **Realtime subscription** setup for instant notifications

### Step 5: Resources Management 📚
**File**: `setup_resources.sql`

This creates the resources management system for file uploads and learning materials.

**What it creates**:
- `resources` table - file metadata and text content
- RLS policies for upload permissions
- Indexes for tags and search

### Step 6: Storage Buckets ☁️
**Guide**: `SETUP_STORAGE_BUCKETS.md`

After running all SQL files, you need to create storage buckets in Supabase for file uploads.

**Required bucket**:
- `resources` - for learning materials uploaded by mentors

## 📋 Complete Setup Checklist

- [ ] **Step 1**: Run `FRESH_START.sql` to create profiles table
- [ ] **Step 2**: Run `setup_points_system.sql` to create points system
- [ ] **Step 3**: Run `setup_discussions.sql` to create discussion forum
- [ ] **Step 4**: Run `setup_notifications.sql` to create notification system
- [ ] **Step 5**: Run `setup_resources.sql` to create resources management
- [ ] **Step 6**: Create `resources` storage bucket (see guide below)
- [ ] **Step 7**: Set up storage bucket policies (see guide below)

## 🔧 How to Run SQL Files

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New query"**
4. Copy the contents of the SQL file
5. Paste into the editor
6. Click **"Run"** or press `Cmd/Ctrl + Enter`
7. Check for success messages at the bottom
8. If there are errors, read them carefully and fix any issues

## 📦 Storage Bucket Setup (Step 6 & 7)

### Create the Resources Bucket

1. **Go to Supabase Dashboard**
   - Navigate to **Storage** in the left sidebar

2. **Create New Bucket**
   - Click **"New bucket"** button
   - Fill in the details:
     - **Name**: `resources`
     - **Public bucket**: ✅ **Check this box** (Enable public access)
     - **File size limit**: 50MB (or your preference)

3. **Click "Create bucket"**

### Set Up Bucket Policies

After creating the bucket, set up access policies:

1. Click on the `resources` bucket
2. Go to **"Policies"** tab
3. Click **"New policy"** for each policy below:

#### Policy 1: Public Read Access
- **Policy name**: `Public read access`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **Policy definition**:
```sql
(bucket_id = 'resources'::text)
```

#### Policy 2: Authenticated Upload
- **Policy name**: `Authenticated users can upload`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
(bucket_id = 'resources'::text)
```

#### Policy 3: Users Can Delete Own Files
- **Policy name**: `Users can delete own files`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
(bucket_id = 'resources'::text AND auth.uid() = owner)
```

#### Policy 4: Users Can Update Own Files
- **Policy name**: `Users can update own files`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
(bucket_id = 'resources'::text AND auth.uid() = owner)
```

## ✅ Verification

After running all SQL files, verify the setup:

### Check Tables Exist

Run this query in the SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'profiles',
  'points_config',
  'points_history',
  'discussions',
  'discussion_comments',
  'discussion_votes',
  'notifications',
  'user_notifications',
  'resources'
)
ORDER BY table_name;
```

**Expected result**: All 9 tables listed.

### Check Functions Exist

Run this query:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'award_points',
  'adjust_points_manual',
  'get_user_total_points',
  'mark_notification_read',
  'get_unread_notification_count',
  'broadcast_notification_to_users',
  'update_discussion_vote_counts'
)
ORDER BY routine_name;
```

**Expected result**: All 7 functions listed.

### Check Storage Buckets

1. Go to **Storage** in Supabase Dashboard
2. Verify `resources` bucket exists
3. Check that it's marked as **Public**
4. Verify 4 policies are in place

## 🐛 Troubleshooting

### "Function does not exist" error

The `handle_updated_at()` function is created in `FRESH_START.sql`. Make sure you run that file first.

**Solution**: Run `FRESH_START.sql` first, then run the other files.

### "Table already exists" error

If you need to re-run a setup file, the `DROP TABLE IF EXISTS` statements at the top will remove existing tables.

**Warning**: This will delete all data in those tables.

### Database error when uploading resources

Common causes:
1. **Resources table doesn't exist** → Run `setup_resources.sql`
2. **Storage bucket doesn't exist** → Create the `resources` bucket
3. **Permission denied** → Check RLS policies and storage policies

**Check with**:
```sql
-- Check if resources table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'resources'
);
```

### Realtime notifications not working

Make sure realtime is enabled for `user_notifications`:

```sql
-- Check if realtime is enabled
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

If `user_notifications` is not listed, run:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
```

### File upload fails with "Bucket not found"

1. Verify the bucket name is exactly `resources` (lowercase)
2. Check that the bucket exists in **Storage** section
3. Verify the bucket is marked as **Public**

### "Permission denied" when uploading files

1. Check storage bucket policies are created
2. Verify you're logged in as a mentor or admin
3. Check RLS policies on the `resources` table

## 🎯 Features After Setup

Once everything is set up, your platform will have:

✅ **User Profiles** - Complete user management with roles
✅ **Points System** - Gamification with automatic point awards
✅ **Discussion Forum** - Threaded discussions with votes and comments
✅ **Real-time Notifications** - Instant notifications to students
✅ **Resources Management** - File uploads and text content sharing
✅ **Security** - RLS policies protecting all data
✅ **Performance** - Optimized indexes for fast queries

## 📞 Need Help?

If you encounter issues:

1. ✅ Check the browser console for detailed error messages
2. ✅ Check the Supabase logs in the Dashboard (Logs section)
3. ✅ Verify RLS policies are set up correctly
4. ✅ Make sure all prerequisite tables exist
5. ✅ Check that storage buckets are created with correct permissions
6. ✅ Verify you're using a mentor or admin account for uploads

## 🔄 Order Matters!

**Important**: Run the SQL files in the order listed above. Later files depend on tables and functions created by earlier ones.

1. `FRESH_START.sql` - Creates `profiles` and `handle_updated_at()` function
2. `setup_points_system.sql` - Requires `profiles` table
3. `setup_discussions.sql` - Requires `profiles` and `handle_updated_at()`
4. `setup_notifications.sql` - Requires `profiles` and `handle_updated_at()`
5. `setup_resources.sql` - Requires `profiles` and `handle_updated_at()`

## 🎉 You're All Set!

After completing all steps, your Edutou platform will be fully functional with all features working correctly.

Happy teaching and learning! 🚀
