# Notifications System - Complete Setup Guide

## 🎯 Overview

This is a **completely rewritten** notification system with a simpler, more reliable architecture:

- ✅ **One table** - No complex joins or triggers
- ✅ **Direct inserts** - Each notification creates one row per student
- ✅ **Real-time** - Instant delivery without page refresh
- ✅ **Server-side API** - Reliable broadcasting through Next.js API
- ✅ **Simple queries** - Just filter by `user_id`

## 📋 How It Works

### Architecture

1. **Admin sends notification** → Calls API endpoint `/api/notifications/broadcast`
2. **API fetches all students** → Gets student IDs from profiles table
3. **API creates notifications** → Inserts one row per student in notifications table
4. **Real-time triggers** → Supabase broadcasts to connected students instantly
5. **Students receive** → Bell icon updates with badge automatically

### Database Schema

```sql
notifications (
  id uuid PRIMARY KEY,
  user_id uuid → Student who receives this notification
  title text,
  message text,
  is_read boolean,
  read_at timestamptz,
  created_by uuid → Admin/mentor who sent it
  created_by_role text,
  created_at timestamptz
)
```

**Key point**: Each notification to a student = **1 row**. To notify 10 students = **10 rows**.

## 🚀 Setup Steps

### Step 1: Run the SQL Setup

Run this file in Supabase SQL Editor:
```
database/notifications_fresh_start.sql
```

This will:
- ✅ Drop old notification system (user_notifications table)
- ✅ Create new simple notifications table
- ✅ Set up indexes for performance
- ✅ Configure RLS policies
- ✅ **Enable Realtime** for instant delivery
- ✅ Create helper function `get_unread_count()`

### Step 2: Verify Setup

After running the SQL, run these verification queries:

```sql
-- Check table exists
SELECT COUNT(*) FROM notifications;

-- Check realtime is enabled
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';
-- Should return: notifications

-- Check students exist
SELECT COUNT(*) FROM profiles WHERE role = 'student';
-- Should return: number > 0
```

### Step 3: Test the System

1. **Login as Admin**
2. **Go to Manage Notifications**
3. **Send a test notification**
4. **Check console** - should see:
   ```
   Sending notification via API...
   Notification broadcast result: { success: true, count: X }
   ```
5. **Alert should show**: "✅ Notification sent successfully to X student(s)!"

6. **Login as Student** (in another browser/incognito)
7. **Check console** - should see:
   ```
   🔔 Setting up real-time notifications for student: <id>
   📡 Real-time subscription status: SUBSCRIBED
   ✅ Successfully subscribed to notifications!
   📥 Fetched X notifications
   🔔 Unread count: X
   ```
8. **Check bell icon** - should show badge with count

9. **Send another notification** (as admin)
10. **Student should see** (without refreshing):
    ```
    🔔 Received new notification in real-time: {...}
    ✅ Adding notification to list: {...}
    ```
11. **Bell badge updates instantly** ✨

## 🔍 Troubleshooting

### Issue: "Sent to 0 students"

**Cause**: No student profiles in database

**Check**:
```sql
SELECT COUNT(*) FROM profiles WHERE role = 'student';
```

**Solution**: Create a student account or change an existing user's role to 'student'

### Issue: Notification sent but student doesn't receive

**Check 1 - Database**:
```sql
-- Check if notifications were created
SELECT COUNT(*) FROM notifications WHERE created_at > NOW() - INTERVAL '5 minutes';

-- Check specific student
SELECT * FROM notifications WHERE user_id = '<student-user-id>' ORDER BY created_at DESC LIMIT 5;
```

**Check 2 - Realtime**:
```sql
-- Verify realtime is enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';
```

If not enabled, run:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

**Check 3 - RLS Policies**:
```sql
-- Check policies exist
SELECT policyname FROM pg_policies WHERE tablename = 'notifications';
```

Should see:
- Users can view own notifications
- Users can update own notifications
- Admins and mentors can create notifications

### Issue: Real-time not working (no instant updates)

**Student console should show**:
```
📡 Real-time subscription status: SUBSCRIBED
✅ Successfully subscribed to notifications!
```

If you see `CLOSED` or error:
1. Check Supabase Realtime is enabled in project settings
2. Verify the table is in the realtime publication (see Check 2 above)
3. Check browser console for WebSocket errors

### Issue: Bell icon doesn't show notifications

**Check console logs**:
- Look for: `📥 Fetching notifications for user: <id>`
- Should see: `✅ Fetched X notifications`
- Should see: `🔔 Unread count: X`

If count is 0 but notifications exist in database:
- Check RLS policies
- Verify `user_id` matches logged-in student

## 📊 Console Logging Guide

### Admin Side

When sending notification:
```
Sending notification via API...
Notification broadcast result: { success: true, count: 5, message: "Notification sent to 5 user(s)" }
```

### Student Side

On page load:
```
🔔 Setting up real-time notifications for student: abc-123-def
📡 Real-time subscription status: CHANNEL_STATE.joining
📡 Real-time subscription status: SUBSCRIBED
✅ Successfully subscribed to notifications!
📥 Fetching notifications for user: abc-123-def
✅ Fetched 3 notifications
🔔 Unread count: 2
```

When receiving real-time notification:
```
🔔 Received new notification in real-time: { new: { id: "...", title: "...", ... } }
✅ Adding notification to list: { id: "...", title: "Test", ... }
```

When clicking notification:
```
✅ Marked notification as read: xyz-456-abc
```

## 🎨 Features

### For Students
- ✅ **Bell icon** in header with unread badge
- ✅ **Dropdown** shows last 10 notifications
- ✅ **Visual distinction** - unread notifications highlighted
- ✅ **Click to mark read** - badge count decreases
- ✅ **Real-time updates** - no refresh needed

### For Admins/Mentors
- ✅ **Simple form** - title and message
- ✅ **Broadcast to all students** - one click
- ✅ **Confirmation** - shows how many students received it
- ✅ **View sent** - see all notifications you've sent
- ✅ **Delete** - remove sent notifications

## 🔐 Security

- ✅ **RLS policies** - Students only see their own notifications
- ✅ **Role check** - Only admin/mentor can send
- ✅ **Server-side API** - Can't bypass by calling database directly
- ✅ **User validation** - API verifies sender's role

## 📈 Performance

- ✅ **Indexed queries** - Fast lookups by user_id
- ✅ **Limited fetch** - Only gets last 10
- ✅ **Efficient realtime** - Filtered by user_id at database level
- ✅ **Optimized updates** - Only updates affected rows

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ Admin sends notification → Alert says "sent to X students" (X > 0)
2. ✅ Student sees bell icon with red badge
3. ✅ Student clicks bell → Sees notification list
4. ✅ Send new notification → Student's bell updates instantly without refresh
5. ✅ Student clicks notification → Badge count decreases
6. ✅ Console shows emojis (🔔 📡 ✅) with successful messages

## 🆘 Still Having Issues?

1. Run the verification queries in Step 2
2. Check all console logs match the examples above
3. Verify Supabase Realtime is enabled in project settings
4. Make sure you have at least one student account
5. Try in incognito/different browser to rule out caching

Good luck! 🚀
