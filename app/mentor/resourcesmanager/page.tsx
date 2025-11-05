'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  Loader2,
  Trash2,
  Tag,
  Calendar,
  User,
  Eye,
  File,
  X,
  Plus,
} from 'lucide-react'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/components/ui/use-toast'

interface Resource {
  id: string
  file_name: string | null
  file_url: string | null
  file_type: string | null
  file_size: number | null
  uploaded_by: string
  tags: string[]
  description: string | null
  text_content: string | null
  created_at: string
  updated_at: string
  uploader_name: string | null
  uploader_email: string | null
}

export default function ResourcesManagerPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resources, setResources] = useState<Resource[]>([])
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [textContent, setTextContent] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [viewingResource, setViewingResource] = useState<Resource | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchCurrentUser()
    fetchResources()
  }, [])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
    }
  }

  const fetchResources = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching resources:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        toast({
          title: "Error loading resources",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      console.log('Fetched resources:', data)
      console.log('Number of resources:', data?.length || 0)

      if (!data || data.length === 0) {
        console.warn('No resources found in database.')
        setResources([])
        return
      }

      // Fetch uploader details separately
      const formattedData: Resource[] = await Promise.all(
        data.map(async (resource: any) => {
          let uploaderName = null
          let uploaderEmail = null

          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', resource.uploaded_by)
              .single()

            uploaderName = profileData?.full_name || null
            uploaderEmail = profileData?.email || null
          } catch (profileError) {
            console.warn('Could not fetch profile for:', resource.uploaded_by)
          }

          return {
            ...resource,
            uploader_name: uploaderName,
            uploader_email: uploaderEmail,
          }
        })
      )

      console.log('Formatted resources:', formattedData)
      setResources(formattedData)
    } catch (err) {
      console.error('Unexpected error:', err)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleUpload = async () => {
    if (!currentUserId) {
      toast({
        title: "Missing information",
        description: "You must be logged in",
        variant: "destructive",
      })
      return
    }

    // Validate that either file or text content is provided
    if (!selectedFile && !textContent.trim()) {
      toast({
        title: "Missing content",
        description: "Please either select a file or enter text content",
        variant: "destructive",
      })
      return
    }

    try {
      setUploading(true)

      let publicUrl = null
      let fileName = null
      let fileType = null
      let fileSize = null

      // Upload file if selected
      if (selectedFile) {
        // Generate unique file name
        const fileExt = selectedFile.name.split('.').pop()
        fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${fileName}`

        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, selectedFile)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          toast({
            title: "Upload failed",
            description: "Failed to upload file. Please try again.",
            variant: "destructive",
          })
          return
        }

        // Get public URL
        const { data: { publicUrl: url } } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath)

        publicUrl = url
        fileName = selectedFile.name
        fileType = selectedFile.type || 'application/octet-stream'
        fileSize = selectedFile.size
      }

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('resources')
        .insert({
          file_name: fileName,
          file_url: publicUrl,
          file_type: fileType,
          file_size: fileSize,
          uploaded_by: currentUserId,
          tags: tags,
          description: description.trim() || null,
          text_content: textContent.trim() || null,
        })

      if (dbError) {
        console.error('Database error:', dbError)
        toast({
          title: "Database error",
          description: selectedFile ? "File uploaded but failed to save metadata" : "Failed to save resource",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: selectedFile
          ? `${selectedFile.name} has been uploaded successfully`
          : "Text resource has been posted successfully",
      })

      // Reset form
      setUploadDialogOpen(false)
      setSelectedFile(null)
      setDescription('')
      setTextContent('')
      setTags([])
      setTagInput('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Refresh resources list
      fetchResources()
    } catch (err) {
      console.error('Error:', err)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (resource: Resource) => {
    try {
      // Delete from storage if file exists
      if (resource.file_url) {
        const urlParts = resource.file_url.split('/resources/')
        const filePath = urlParts[urlParts.length - 1]

        const { error: storageError } = await supabase.storage
          .from('resources')
          .remove([filePath])

        if (storageError) {
          console.error('Storage deletion error:', storageError)
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('resources')
        .delete()
        .eq('id', resource.id)

      if (dbError) {
        console.error('Database deletion error:', dbError)
        toast({
          title: "Delete failed",
          description: "Failed to delete resource",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Resource deleted",
        description: resource.file_name ? `${resource.file_name} has been deleted` : "Resource has been deleted",
      })

      fetchResources()
    } catch (err) {
      console.error('Error:', err)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <main className="overflow-hidden bg-slate-50 dark:bg-black reading:bg-amber-50 min-h-screen transition-colors duration-300">
      <Sidebar isOpen={mobileMenuOpen} isMobile onClose={() => setMobileMenuOpen(false)} />
      <Sidebar isOpen={sidebarOpen} />

      <div
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
          sidebarOpen ? 'md:pl-64' : 'md:pl-0'
        )}
      >
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <div className="space-y-8 px-4 py-8 md:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                Resources Manager
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400 reading:text-amber-700">
                Upload and manage learning resources for students
              </p>
            </div>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Resource
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-cyan-500 reading:text-orange-500" />
            </div>
          ) : resources.length === 0 ? (
            <Card className="rounded-3xl p-12 text-center">
              <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100 reading:text-amber-900">
                No Resources Yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Upload your first resource to get started
              </p>
              <Button
                onClick={() => setUploadDialogOpen(true)}
                className="rounded-xl"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Resource
              </Button>
            </Card>
          ) : (
            /* Resources List */
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {resources.map((resource, index) => (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-none shadow-lg rounded-3xl bg-white dark:bg-slate-800 reading:bg-amber-50 h-full flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {resource.file_name ? (
                              <File className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            ) : (
                              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                            )}
                            <CardTitle className="text-lg text-gray-900 dark:text-gray-100 reading:text-amber-900 truncate">
                              {resource.file_name || (resource.description || 'Text Resource')}
                            </CardTitle>
                          </div>
                          <CardDescription className="text-xs">
                            {resource.file_size ? formatFileSize(resource.file_size) : 'Text Post'}
                          </CardDescription>
                        </div>
                        <Button
                          onClick={() => handleDelete(resource)}
                          variant="ghost"
                          size="sm"
                          className="rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col">
                      {/* Description */}
                      {resource.description && !resource.text_content && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 reading:text-amber-800 line-clamp-2">
                          {resource.description}
                        </p>
                      )}

                      {/* Text Content */}
                      {resource.text_content && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 reading:bg-amber-100 rounded-xl">
                          <p className="text-sm text-gray-700 dark:text-gray-300 reading:text-amber-800 whitespace-pre-wrap">
                            {resource.text_content}
                          </p>
                        </div>
                      )}

                      {/* Tags */}
                      {resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {resource.tags.map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="rounded-full text-xs"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex-1" />

                      {/* Metadata */}
                      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(resource.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{resource.uploader_name || resource.uploader_email || 'Unknown'}</span>
                        </div>
                      </div>

                      {/* View Button - Only for files */}
                      {resource.file_url && (
                        <Button
                          onClick={() => setViewingResource(resource)}
                          variant="outline"
                          className="w-full rounded-xl"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View File
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="rounded-3xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Post Resource</DialogTitle>
            <DialogDescription>
              Share a file or text content with your students
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Select File (Optional)
              </label>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 rounded-xl"
                >
                  <Upload className="h-4 w-4" />
                  Choose File
                </Button>
                {selectedFile && (
                  <div className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Text Content */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Text Content (Optional)
              </label>
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Share notes, instructions, or any text content..."
                className="rounded-xl min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can post text content, a file, or both
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Title/Description (Optional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief title or description..."
                className="rounded-xl min-h-[60px]"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder="Add a tag..."
                  className="rounded-xl"
                />
                <Button
                  onClick={handleAddTag}
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="rounded-full"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setUploadDialogOpen(false)}
              variant="outline"
              className="rounded-xl"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600"
              disabled={uploading || (!selectedFile && !textContent.trim())}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {selectedFile ? 'Uploading...' : 'Posting...'}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {selectedFile ? 'Upload' : 'Post'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {viewingResource && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setViewingResource(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full h-full max-w-7xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-t-2xl p-4 mb-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <File className="h-5 w-5 text-white flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">
                      {viewingResource.file_name}
                    </h3>
                    <p className="text-white/70 text-xs">
                      {formatFileSize(viewingResource.file_size)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setViewingResource(null)}
                  variant="ghost"
                  size="sm"
                  className="rounded-xl bg-white/20 hover:bg-white/30 text-white flex-shrink-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* PDF Viewer */}
              <div className="flex-1 bg-white rounded-b-2xl overflow-hidden shadow-2xl">
                <iframe
                  src={`${viewingResource.file_url}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="w-full h-full"
                  title={viewingResource.file_name}
                  style={{
                    border: 'none',
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
