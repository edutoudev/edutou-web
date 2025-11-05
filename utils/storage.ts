import { createClient } from '@/utils/supabase/client'

export interface UploadResult {
  url: string | null
  error: string | null
}

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param userId - The user's ID (for folder structure)
 * @param taskId - The task ID
 * @param stepId - The step ID
 * @returns Object with url or error
 */
export async function uploadTaskFile(
  file: File,
  userId: string,
  taskId: string,
  stepId: string
): Promise<UploadResult> {
  try {
    const supabase = createClient()

    // Create a unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${userId}/${taskId}/${stepId}/${fileName}`

    // Upload file
    const { data, error } = await supabase.storage
      .from('task-submissions')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { url: null, error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('task-submissions')
      .getPublicUrl(data.path)

    return { url: urlData.publicUrl, error: null }
  } catch (err) {
    console.error('Upload exception:', err)
    return { url: null, error: 'Failed to upload file' }
  }
}

/**
 * Upload multiple files to Supabase Storage
 * @param files - Array of files to upload
 * @param userId - The user's ID
 * @param taskId - The task ID
 * @param stepId - The step ID
 * @returns Array of URLs and errors
 */
export async function uploadTaskFiles(
  files: File[],
  userId: string,
  taskId: string,
  stepId: string
): Promise<UploadResult[]> {
  const results: UploadResult[] = []

  for (const file of files) {
    const result = await uploadTaskFile(file, userId, taskId, stepId)
    results.push(result)
  }

  return results
}

/**
 * Delete a file from Supabase Storage
 * @param filePath - The full path to the file
 * @returns Boolean indicating success
 */
export async function deleteTaskFile(filePath: string): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase.storage
      .from('task-submissions')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Delete exception:', err)
    return false
  }
}
