'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  FileText,
  Calendar,
  User,
  Tag,
  Eye,
  Filter,
  X,
  Loader2,
  File,
} from 'lucide-react'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'

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

export default function ResourcesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resources, setResources] = useState<Resource[]>([])
  const [filteredResources, setFilteredResources] = useState<Resource[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [viewingResource, setViewingResource] = useState<Resource | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchResources()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [resources, searchQuery, selectedTags])

  const fetchResources = async () => {
    try {
      setLoading(true)

      // First, try to fetch without the profiles join to see if that's the issue
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching resources:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        alert(`Error loading resources: ${error.message}. Check console for details.`)
        return
      }

      console.log('Fetched resources:', data)
      console.log('Number of resources:', data?.length || 0)

      if (!data || data.length === 0) {
        console.warn('No resources found in database. Files may exist in storage but not in database.')
        setResources([])
        return
      }

      // Now try to fetch uploader details separately
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

      // Extract all unique tags
      const tagsSet = new Set<string>()
      formattedData.forEach(resource => {
        resource.tags.forEach(tag => tagsSet.add(tag))
      })
      setAllTags(Array.from(tagsSet).sort())
    } catch (err) {
      console.error('Unexpected error:', err)
      alert(`Unexpected error: ${err}. Check console for details.`)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...resources]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(resource =>
        resource.file_name.toLowerCase().includes(query) ||
        resource.description?.toLowerCase().includes(query) ||
        resource.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(resource =>
        selectedTags.some(tag => resource.tags.includes(tag))
      )
    }

    setFilteredResources(filtered)
  }

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const clearFilters = () => {
    setSelectedTags([])
    setSearchQuery('')
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

  const hasActiveFilters = selectedTags.length > 0 || searchQuery.trim() !== ''

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
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Learning Resources
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400 reading:text-amber-700">
              Browse and download educational materials
            </p>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'default' : 'outline'}
              className="rounded-xl"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filter by Tags
            </Button>
            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                className="rounded-xl"
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Tag Filters */}
          {showFilters && allTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800 reading:bg-amber-50 border border-gray-200 dark:border-slate-700"
            >
              <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100 reading:text-amber-900">
                Filter by Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'cursor-pointer rounded-full transition-colors',
                      selectedTags.includes(tag)
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                    )}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}

          {/* Active Filters Display */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => toggleTag(tag)}
                    className="ml-2 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-cyan-500 reading:text-orange-500" />
            </div>
          ) : filteredResources.length === 0 ? (
            <Card className="rounded-3xl p-12 text-center">
              <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100 reading:text-amber-900">
                {hasActiveFilters ? 'No Resources Found' : 'No Resources Yet'}
              </h3>
              <p className="text-muted-foreground">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search query'
                  : 'Resources will appear here once uploaded'}
              </p>
            </Card>
          ) : (
            /* Resources Grid */
            <div>
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredResources.length} of {resources.length} resources
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredResources.map((resource, index) => (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-none shadow-lg rounded-3xl bg-white dark:bg-slate-800 reading:bg-amber-50 h-full flex flex-col">
                      <CardHeader>
                        <div className="flex items-start gap-2">
                          {resource.file_name ? (
                            <File className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                          ) : (
                            <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg text-gray-900 dark:text-gray-100 reading:text-amber-900 break-words">
                              {resource.file_name || (resource.description || 'Text Resource')}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {resource.file_size ? formatFileSize(resource.file_size) : 'Text Post'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 flex-1 flex flex-col">
                        {/* Description */}
                        {resource.description && !resource.text_content && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 reading:text-amber-800 line-clamp-3">
                            {resource.description}
                          </p>
                        )}

                        {/* Text Content */}
                        {resource.text_content && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-900 reading:bg-amber-100 rounded-xl">
                            <p className="text-sm text-gray-700 dark:text-gray-300 reading:text-amber-800 whitespace-pre-wrap line-clamp-6">
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
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              Uploaded: {formatDate(resource.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {resource.uploader_name || resource.uploader_email || 'Unknown'}
                            </span>
                          </div>
                        </div>

                        {/* View Button - Only for files */}
                        {resource.file_url && (
                          <Button
                            onClick={() => setViewingResource(resource)}
                            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600"
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
            </div>
          )}
        </div>
      </div>

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
