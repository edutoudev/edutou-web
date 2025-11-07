# Points System Fix - Complete Guide

## Problem Summary

The leaderboard points system wasn't updating properly across different features (quizzes, tasks, discussions, comments). Users' `leaderboard_points` in the profiles table remained at 0 even after completing activities.

## Root Causes Identified

### 1. **Missing SECURITY DEFINER on Database Functions**
The `award_points()` and `adjust_points_manual()` functions didn't have `SECURITY DEFINER` attribute, causing them to fail when trying to update the profiles table due to Row Level Security (RLS) policies.

### 2. **Quiz System Bypassing Unified Points System**
The quiz submission was directly updating `profiles.leaderboard_points` instead of using the unified points system, causing inconsistencies.

## Files Modified

### 1. `app/student/quiz/[sessionId]/actions.ts`
**Changes:**
- Added import: `import { adjustPointsManual } from '@/utils/points'`
- Replaced direct profile update (lines 169-178) with:
```typescript
await adjustPointsManual({
  userId: user.id,
  actionType: 'quiz_completion',
  points: pointsEarned,
  referenceId: sessionId,
  referenceType: 'quiz_session',
  description: `Quiz question ${questionIndex + 1}: ${pointsEarned} points (streak: ${newStreak})`
})
```

### 2. `database/setup_points_system.sql`
**Changes:**
- Added `SECURITY DEFINER` to all three functions:
  - `award_points()`
  - `adjust_points_manual()`
  - `get_user_total_points()`
- Added `SET search_path = public` for security
- Updated function syntax for consistency

### 3. `database/FIX_POINTS_SYSTEM.sql` (NEW)
**Purpose:**
- Migration script to update existing database
- Recreates all functions with proper security settings
- Initializes any NULL leaderboard_points to 0
- Includes verification queries

## How to Apply the Fix

### Step 1: Run the Migration Script

Execute the migration script in your Supabase SQL Editor:

```bash
# Copy the file contents or run directly
cat database/FIX_POINTS_SYSTEM.sql
```

Then paste and run in Supabase Dashboard → SQL Editor

### Step 2: Verify the Fix

After running the migration, check the output of the verification queries:

1. **Function Security Check** - Should show "SECURITY DEFINER" for all three functions
2. **Points Config Check** - Should show all configured point actions
3. **Active Configurations** - Should list point values for each action type

### Step 3: Test the System

Test each feature to ensure points are being awarded:

1. **Quizzes:**
   - Complete a quiz question
   - Check `profiles.leaderboard_points` increased
   - Check `points_history` table has a record

2. **Tasks:**
   - Submit a task
   - Verify 10 points were awarded
   - Check both tables updated

3. **Discussions:**
   - Create a discussion (5 points)
   - Add a comment (2 points)
   - Verify points in profiles

4. **Leaderboard:**
   - View `/leaderboard` page
   - Verify your points are displayed correctly

## How the Unified Points System Works

### Database Functions

#### 1. `award_points(userId, actionType, ...)`
- Looks up point value from `points_config` table
- Awards configured points for standard actions
- Updates both `points` and `leaderboard_points` in profiles
- Records transaction in `points_history`

#### 2. `adjust_points_manual(userId, actionType, points, ...)`
- Awards custom point amounts (used for quizzes with bonuses)
- Updates both `points` and `leaderboard_points` in profiles
- Records transaction in `points_history`

#### 3. `get_user_total_points(userId)`
- Returns user's total points from profiles table

### Point Values (Configurable in `points_config` table)

| Action Type | Points | Used By |
|------------|--------|---------|
| task_submission | 10 | Task completion |
| discussion_create | 5 | Creating discussion |
| discussion_comment | 2 | Commenting on discussion |
| quiz_completion | Variable | Quiz questions (with bonuses) |
| quiz_perfect_score | 20 | Perfect quiz score bonus |
| resource_upload | 15 | Uploading resources |
| hackathon_participation | 50 | Hackathon participation |
| feedback_submission | 5 | Submitting feedback |
| daily_login | 1 | Daily login bonus |
| profile_completion | 10 | Completing profile |

### Frontend Implementation

#### Quizzes
```typescript
// app/student/quiz/[sessionId]/actions.ts
await adjustPointsManual({
  userId: user.id,
  actionType: 'quiz_completion',
  points: calculatedPoints, // Base + speed bonus + streak multiplier
  referenceId: sessionId,
  referenceType: 'quiz_session',
  description: `Quiz question ${questionIndex + 1}: ${pointsEarned} points`
})
```

#### Tasks
```typescript
// app/task/page.tsx (line 366)
await awardPoints({
  userId: user.id,
  actionType: 'task_submission',
  referenceId: task.id,
  referenceType: 'task',
  description: `Completed task: ${task.title}`
})
```

#### Discussions
```typescript
// app/discussion/page.tsx (line 528)
await awardPoints({
  userId: currentUserId,
  actionType: 'discussion_create',
  referenceId: data.id,
  referenceType: 'discussion',
  description: `Created discussion: ${title.trim()}`
})
```

#### Comments
```typescript
// app/discussion/page.tsx (line 218)
await awardPoints({
  userId: currentUserId,
  actionType: 'discussion_comment',
  referenceId: data.id,
  referenceType: 'discussion_comment',
  description: `Commented on: ${thread.title}`
})
```

## Database Schema

### profiles table
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  points integer DEFAULT 0,              -- Total points earned
  leaderboard_points integer DEFAULT 0,  -- Points shown on leaderboard
  ...
)
```

### points_history table
```sql
CREATE TABLE public.points_history (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  action_type text,
  points integer,
  reference_id text,      -- ID of related entity (quiz, task, etc)
  reference_type text,    -- Type of entity
  description text,
  created_at timestamptz
)
```

### points_config table
```sql
CREATE TABLE public.points_config (
  id uuid PRIMARY KEY,
  action_type text UNIQUE,
  points integer,
  description text,
  is_active boolean DEFAULT true,
  ...
)
```

## Troubleshooting

### Points still not updating?

1. **Check database functions exist:**
```sql
SELECT proname, prosecdef
FROM pg_proc
WHERE proname IN ('award_points', 'adjust_points_manual');
```

2. **Check RLS policies on profiles:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

3. **Check points_history for records:**
```sql
SELECT * FROM points_history
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

4. **Manually test the function:**
```sql
SELECT award_points(
  'YOUR_USER_ID'::uuid,
  'task_submission',
  'test-ref-id',
  'test',
  'Test point award'
);

-- Then check your points
SELECT id, full_name, points, leaderboard_points
FROM profiles
WHERE id = 'YOUR_USER_ID'::uuid;
```

### Error: "function does not exist"

Run the migration script `FIX_POINTS_SYSTEM.sql` to create the functions.

### Error: "permission denied for table profiles"

The functions need `SECURITY DEFINER` - ensure you ran the migration script.

### Points in history but not in profiles

Check if profiles table has NULL values:
```sql
UPDATE profiles
SET
  points = COALESCE(points, 0),
  leaderboard_points = COALESCE(leaderboard_points, 0)
WHERE points IS NULL OR leaderboard_points IS NULL;
```

## Summary

✅ **Quiz points** now use the unified points system via `adjustPointsManual()`
✅ **Task points** correctly use `awardPoints()`
✅ **Discussion & comment points** correctly use `awardPoints()`
✅ **Database functions** have `SECURITY DEFINER` to bypass RLS
✅ **Both `points` and `leaderboard_points`** are updated consistently
✅ **All point transactions** are logged in `points_history`

Your leaderboard points should now update correctly across all features!
