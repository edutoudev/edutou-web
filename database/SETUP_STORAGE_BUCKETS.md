# Supabase Storage Bucket Setup

This guide explains how to create the necessary storage buckets for file uploads in your application.

## Required Storage Bucket

### Resources Bucket

The application uses a storage bucket called `resources` to store files uploaded by mentors and admins.

## How to Create the Resources Bucket

1. **Go to Supabase Dashboard**
   - Open your Supabase project
   - Navigate to **Storage** in the left sidebar

2. **Create New Bucket**
   - Click on **"New bucket"** button
   - Fill in the details:
     - **Name**: `resources`
     - **Public bucket**: ✅ **Check this box** (Enable public access)
     - **File size limit**: Leave default or set to your preference (e.g., 50MB)
     - **Allowed MIME types**: Leave empty to allow all file types, or restrict to specific types

3. **Click "Create bucket"**

## Setting Up Bucket Policies (Important!)

After creating the bucket, you need to set up policies to control access:

### Option 1: Using the Dashboard (Recommended)

1. Click on the `resources` bucket
2. Go to **"Policies"** tab
3. Click **"New policy"**
4. Create the following policies:

#### Policy 1: Public Read Access
- **Policy name**: `Public read access`
- **Allowed operation**: `SELECT`
- **Target roles**: `anon`, `authenticated`
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

#### Policy 3: User Delete Own Files
- **Policy name**: `Users can delete own files`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
(bucket_id = 'resources'::text)
```

### Option 2: Using SQL (Advanced)

You can also create these policies using SQL in the SQL Editor:

```sql
-- Allow public read access to resources bucket
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resources');

-- Allow authenticated users to upload to resources bucket
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resources');

-- Allow users to update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'resources' AND auth.uid() = owner);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resources' AND auth.uid() = owner);
```

## Verify Setup

To verify the bucket is set up correctly:

1. Go to **Storage** → **resources** bucket
2. You should see an empty bucket
3. Try uploading a file through the application

## Troubleshooting

### Upload fails with "Bucket not found"
- Make sure the bucket name is exactly `resources` (lowercase)
- Check that the bucket exists in the Storage section

### Upload fails with "Permission denied"
- Verify the bucket is marked as **Public**
- Check that the policies are created correctly
- Make sure you're logged in as a mentor or admin

### Files upload but can't be viewed
- Check that the bucket is set to **Public**
- Verify the public read policy is in place

## Additional Buckets (Optional)

If you need additional buckets for other features, follow the same process:

- **Profile pictures**: Create a `avatars` bucket
- **Task submissions**: Create a `submissions` bucket
- **Quiz resources**: Create a `quiz-materials` bucket

For each bucket, remember to:
1. Create the bucket
2. Mark as public (if files should be publicly accessible)
3. Set up appropriate RLS policies
