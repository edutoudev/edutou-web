'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  MessageSquare,
  TrendingUp,
  Flame,
  Clock,
  ArrowUpDown,
  Filter,
  Share2,
  Bookmark,
  MessageCircle,
  ChevronUp,
  ChevronDown,
  Loader2,
} from 'lucide-react'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { HeroSection } from '@/components/platform/HeroSection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { awardPoints } from '@/utils/points'

const DISCUSSION_FILTERS = [
  { icon: TrendingUp, label: 'Trending' },
  { icon: Flame, label: 'Hot' },
  { icon: Clock, label: 'Recent' },
  { icon: MessageSquare, label: 'Most Discussed' },
]

const CATEGORIES = [
  { id: 'general', name: 'General', color: 'bg-blue-500' },
  { id: 'quiz', name: 'Quiz Help', color: 'bg-purple-500' },
  { id: 'code', name: 'Code Review', color: 'bg-green-500' },
  { id: 'challenge', name: 'Challenge', color: 'bg-orange-500' },
  { id: 'showcase', name: 'Showcase', color: 'bg-pink-500' },
  { id: 'question', name: 'Question', color: 'bg-cyan-500' },
  { id: 'resources', name: 'Resources', color: 'bg-amber-500' },
]

interface Discussion {
  id: string
  user_id: string
  title: string
  description: string
  category: string
  upvotes: number
  downvotes: number
  views: number
  is_pinned: boolean
  created_at: string
  author_name: string | null
  author_email: string | null
  comment_count: number
  user_vote: string | null
}

interface Comment {
  id: string
  user_id: string
  content: string
  upvotes: number
  created_at: string
  author_name: string | null
  author_email: string | null
}

interface ThreadCardProps {
  thread: Discussion
  onVote?: (id: string, direction: 'up' | 'down') => void
  currentUserId: string | null
  onCommentAdded?: () => void
  onThreadClick?: (id: string) => void
}

function getCategoryColor(categoryId: string) {
  return CATEGORIES.find((cat) => cat.id === categoryId)?.color || 'bg-gray-500'
}

function getCategoryName(categoryId: string) {
  return CATEGORIES.find((cat) => cat.id === categoryId)?.name || 'General'
}

function ThreadCard({ thread, onVote, currentUserId, onCommentAdded, onThreadClick }: ThreadCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const supabase = createClient()

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      const parts = name.split(' ')
      return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase()
    }
    if (email) return email.slice(0, 2).toUpperCase()
    return 'AN'
  }

  const getDisplayName = (name: string | null, email: string | null) => {
    return name || email?.split('@')[0] || 'Anonymous'
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    const weeks = Math.floor(days / 7)
    if (weeks < 4) return `${weeks}w ago`
    const months = Math.floor(days / 30)
    return `${months}mo ago`
  }

  const fetchComments = async () => {
    setLoadingComments(true)
    try {
      const { data, error } = await supabase
        .from('discussion_comments')
        .select('*')
        .eq('discussion_id', thread.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching comments:', error)
        return
      }

      // Fetch author profiles for each comment
      const commentsWithAuth = await Promise.all(
        (data || []).map(async (comment: any) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', comment.user_id)
            .single()

          return {
            ...comment,
            author_name: profileData?.full_name || null,
            author_email: profileData?.email || null,
          }
        })
      )

      setComments(commentsWithAuth)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleToggleComments = () => {
    if (!showComments) {
      fetchComments()
    }
    setShowComments(!showComments)
  }

  const handlePostComment = async () => {
    if (!currentUserId) {
      alert('Please log in to comment')
      return
    }

    if (!newComment.trim()) {
      alert('Comment cannot be empty')
      return
    }

    try {
      setSubmittingComment(true)
      const { data, error } = await supabase
        .from('discussion_comments')
        .insert({
          discussion_id: thread.id,
          user_id: currentUserId,
          content: newComment.trim(),
        })
        .select()
        .single()

      if (error) {
        console.error('Error posting comment:', error)
        alert('Failed to post comment')
        return
      }

      // Award points for commenting on discussion (don't fail if points system fails)
      if (data) {
        try {
          await awardPoints({
            userId: currentUserId,
            actionType: 'discussion_comment',
            referenceId: data.id,
            referenceType: 'discussion_comment',
            description: `Commented on: ${thread.title}`
          })
        } catch (pointsError) {
          console.warn('Failed to award points:', pointsError)
          // Continue anyway - points are optional
        }
      }

      setNewComment('')
      fetchComments()
      onCommentAdded?.()
    } catch (err) {
      console.error('Error:', err)
      alert('An error occurred')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleShare = async () => {
    // Create shareable link
    const shareUrl = `${window.location.origin}/discussion#${thread.id}`

    if (navigator.share) {
      // Use Web Share API if available
      try {
        await navigator.share({
          title: thread.title,
          text: thread.description,
          url: shareUrl,
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err)
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert('Link copied to clipboard!')
      } catch (err) {
        console.error('Error copying to clipboard:', err)
        alert('Failed to copy link')
      }
    }
  }

  const handleSave = () => {
    // Toggle saved state (in a real app, this would persist to database)
    setIsSaved(!isSaved)
    // You could also show a toast notification here
    alert(isSaved ? 'Thread unsaved' : 'Thread saved!')
  }

  const netVotes = thread.upvotes - thread.downvotes

  return (
    <motion.div
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden rounded-2xl border transition-all duration-300 hover:border-primary/50">
        <CardContent className="p-0">
          <div className="flex gap-4 p-4">
            {/* Voting Section */}
            <div className="flex flex-shrink-0 flex-col items-center gap-1 rounded-lg bg-muted/50 px-2 py-3">
              <button
                onClick={() => onVote?.(thread.id, 'up')}
                disabled={!currentUserId || thread.user_id === currentUserId}
                className={cn(
                  "text-muted-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  thread.user_vote === 'up' ? "text-orange-500" : "hover:text-orange-500"
                )}
                title={thread.user_id === currentUserId ? "Cannot vote on your own post" : "Upvote"}
              >
                <ChevronUp className="h-5 w-5" />
              </button>
              <span className={cn(
                "text-sm font-semibold",
                netVotes > 0 && "text-orange-500",
                netVotes < 0 && "text-blue-500"
              )}>{netVotes}</span>
              <button
                onClick={() => onVote?.(thread.id, 'down')}
                disabled={!currentUserId || thread.user_id === currentUserId}
                className={cn(
                  "text-muted-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                  thread.user_vote === 'down' ? "text-blue-500" : "hover:text-blue-500"
                )}
                title={thread.user_id === currentUserId ? "Cannot vote on your own post" : "Downvote"}
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>

            {/* Thread Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {thread.is_pinned && (
                  <Badge className="rounded-full bg-amber-500 text-white">
                    Pinned
                  </Badge>
                )}
                <Badge
                  className={`${getCategoryColor(thread.category)} rounded-full text-white`}
                >
                  {getCategoryName(thread.category)}
                </Badge>
              </div>

              {/* Title */}
              <h3
                className="mb-1 cursor-pointer text-lg font-semibold hover:text-primary transition-colors line-clamp-2"
                onClick={() => onThreadClick?.(thread.id)}
              >
                {thread.title}
              </h3>

              {/* Description */}
              <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                {thread.description}
              </p>

              {/* Meta Info */}
              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-semibold">
                      {getInitials(thread.author_name, thread.author_email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">
                    {getDisplayName(thread.author_name, thread.author_email)}
                  </span>
                </div>
                <span>•</span>
                <span>{getTimeAgo(thread.created_at)}</span>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleToggleComments}
                  className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">{thread.comment_count} comments</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-shrink-0 flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-lg p-0"
                aria-label="Share thread"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 rounded-lg p-0",
                  isSaved && "text-primary"
                )}
                aria-label="Save thread"
                onClick={handleSave}
              >
                <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
              </Button>
            </div>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="border-t p-4 space-y-4">
              {/* Comments List */}
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-xs">
                          {getInitials(comment.author_name, comment.author_email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {getDisplayName(comment.author_name, comment.author_email)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getTimeAgo(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment Input */}
              {currentUserId && (
                <div className="flex gap-2 pt-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="rounded-xl flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handlePostComment()
                      }
                    }}
                  />
                  <Button
                    onClick={handlePostComment}
                    disabled={submittingComment || !newComment.trim()}
                    className="rounded-xl"
                    size="sm"
                  >
                    {submittingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Post'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface CreateThreadModalProps {
  onThreadCreated: () => void
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
}

function CreateThreadModal({ onThreadCreated, isOpen: externalIsOpen, setIsOpen: externalSetIsOpen }: CreateThreadModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = externalSetIsOpen || setInternalIsOpen
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('general')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      alert('Please fill in all fields')
      return
    }

    try {
      setSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert('You must be logged in to create a discussion')
        return
      }

      const { data, error } = await supabase
        .from('discussions')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category: selectedCategory,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating discussion:', error)
        alert('Failed to create discussion. Please try again.')
        return
      }

      // Award points for creating a discussion (don't fail if points system fails)
      if (data) {
        try {
          await awardPoints({
            userId: user.id,
            actionType: 'discussion_create',
            referenceId: data.id,
            referenceType: 'discussion',
            description: `Created discussion: ${title.trim()}`
          })
        } catch (pointsError) {
          console.warn('Failed to award points:', pointsError)
          // Continue anyway - points are optional
        }
      }

      // Reset form
      setTitle('')
      setDescription('')
      setSelectedCategory('general')
      setIsOpen(false)
      onThreadCreated()
    } catch (err) {
      console.error('Error:', err)
      alert('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Card className="cursor-pointer rounded-2xl border-dashed transition-all duration-300 hover:border-primary/50">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Plus className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-medium">Create New Thread</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Share your thoughts, ask questions, or showcase your work
            </p>
            <Button
              onClick={() => setIsOpen(true)}
              className="rounded-2xl"
            >
              Start Discussion
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Modal */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl bg-background p-6"
          >
            <h2 className="mb-4 text-2xl font-semibold">Create New Thread</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's on your mind?"
                  className="rounded-2xl"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Category</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(cat.id)}
                      className="rounded-2xl justify-start"
                    >
                      <div className={cn('h-2 w-2 rounded-full mr-2', selectedCategory === cat.id ? 'bg-white' : cat.color)} />
                      {cat.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share more details about your thread..."
                  className="w-full rounded-2xl border border-input bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows={5}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="outline"
                  className="flex-1 rounded-2xl"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 rounded-2xl"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post Thread'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  )
}

interface FilterButtonsProps {
  activeSort: string
  onSortChange: (sort: string) => void
  activeCategory: string | null
  onCategoryChange: (category: string | null) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

function FilterButtons({
  activeSort,
  onSortChange,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: FilterButtonsProps) {
  const sortOptions = [
    { id: 'recent', icon: Clock, label: 'Recent' },
    { id: 'hot', icon: Flame, label: 'Hot' },
    { id: 'top', icon: TrendingUp, label: 'Top' },
    { id: 'discussed', icon: MessageSquare, label: 'Most Discussed' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {sortOptions.map(({ id, icon: Icon, label }) => (
          <Button
            key={id}
            variant={activeSort === id ? 'default' : 'outline'}
            onClick={() => onSortChange(id)}
            className="rounded-2xl"
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        ))}

        <div className="flex-1" />

        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-2xl pl-9 md:w-[250px]"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={activeCategory === null ? 'default' : 'outline'}
          onClick={() => onCategoryChange(null)}
          size="sm"
          className="rounded-full"
        >
          All
        </Button>
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            variant={activeCategory === cat.id ? 'default' : 'outline'}
            onClick={() => onCategoryChange(cat.id)}
            size="sm"
            className="rounded-full"
          >
            <div className={cn('h-2 w-2 rounded-full mr-2', activeCategory === cat.id ? 'bg-white' : cat.color)} />
            {cat.name}
          </Button>
        ))}
      </div>
    </div>
  )
}

export default function DiscussionPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [filteredDiscussions, setFilteredDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [totalThreads, setTotalThreads] = useState(0)
  const [activeSort, setActiveSort] = useState('recent')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchDiscussions()
  }, [])

  useEffect(() => {
    // Check for hash in URL to open shared thread
    const hash = window.location.hash.slice(1) // Remove the # symbol
    if (hash && discussions.length > 0) {
      const thread = discussions.find(d => d.id === hash)
      if (thread) {
        setSelectedThreadId(hash)
      }
    }
  }, [discussions])

  useEffect(() => {
    // Handle browser back/forward buttons
    const handlePopState = () => {
      const hash = window.location.hash.slice(1)
      if (hash && discussions.length > 0) {
        const thread = discussions.find(d => d.id === hash)
        if (thread) {
          setSelectedThreadId(hash)
        } else {
          setSelectedThreadId(null)
        }
      } else {
        setSelectedThreadId(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [discussions])

  useEffect(() => {
    applyFiltersAndSort()
  }, [discussions, activeSort, activeCategory, searchQuery])

  const fetchDiscussions = async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      // Fetch discussions
      const { data: discussionsData, error } = await supabase
        .from('discussions')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching discussions:', error)
        return
      }

      // Get comment counts, user profiles, and votes for each discussion
      const discussionsWithCounts = await Promise.all(
        (discussionsData || []).map(async (discussion) => {
          // Get comment count
          const { count } = await supabase
            .from('discussion_comments')
            .select('*', { count: 'exact', head: true })
            .eq('discussion_id', discussion.id)

          // Get author profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', discussion.user_id)
            .single()

          // Get user's vote if logged in
          let userVote = null
          if (user) {
            const { data: voteData } = await supabase
              .from('discussion_votes')
              .select('vote_type')
              .eq('discussion_id', discussion.id)
              .eq('user_id', user.id)
              .maybeSingle()

            userVote = voteData?.vote_type || null
          }

          return {
            ...discussion,
            author_name: profileData?.full_name || null,
            author_email: profileData?.email || null,
            comment_count: count || 0,
            user_vote: userVote,
          }
        })
      )

      setDiscussions(discussionsWithCounts)
      setTotalThreads(discussionsWithCounts.length)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = [...discussions]

    // Apply category filter
    if (activeCategory) {
      filtered = filtered.filter(d => d.category === activeCategory)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(d =>
        d.title.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (activeSort) {
        case 'hot':
          // Hot: Based on recent votes and activity
          const aScore = (a.upvotes - a.downvotes) + (a.comment_count * 2)
          const bScore = (b.upvotes - b.downvotes) + (b.comment_count * 2)
          return bScore - aScore
        case 'top':
          // Top: By net votes
          return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)
        case 'discussed':
          // Most discussed: By comment count
          return b.comment_count - a.comment_count
        case 'recent':
        default:
          // Recent: By created date
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    // Keep pinned posts at top
    filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      return 0
    })

    setFilteredDiscussions(filtered)
  }

  const handleVote = async (discussionId: string, direction: 'up' | 'down') => {
    if (!currentUserId) {
      alert('Please log in to vote')
      return
    }

    try {
      const discussion = discussions.find(d => d.id === discussionId)
      if (!discussion) return

      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('discussion_votes')
        .select('*')
        .eq('discussion_id', discussionId)
        .eq('user_id', currentUserId)
        .single()

      if (existingVote) {
        // If same vote, remove it
        if (existingVote.vote_type === direction) {
          await supabase
            .from('discussion_votes')
            .delete()
            .eq('id', existingVote.id)
        } else {
          // Change vote
          await supabase
            .from('discussion_votes')
            .update({ vote_type: direction })
            .eq('id', existingVote.id)
        }
      } else {
        // New vote
        await supabase
          .from('discussion_votes')
          .insert({
            discussion_id: discussionId,
            user_id: currentUserId,
            vote_type: direction,
          })
      }

      // Refresh discussions
      fetchDiscussions()
    } catch (err) {
      console.error('Error voting:', err)
    }
  }

  const handleOpenThread = (threadId: string) => {
    setSelectedThreadId(threadId)
    // Update URL hash
    window.history.pushState('', document.title, `/discussion#${threadId}`)
  }

  const handleCloseModal = () => {
    setSelectedThreadId(null)
    // Clear the hash from URL and set to /discussion
    window.history.pushState('', document.title, '/discussion')
  }

  const selectedThread = selectedThreadId ? discussions.find(d => d.id === selectedThreadId) : null

  return (
    <main className="overflow-hidden">
      {/* Mobile Sidebar */}
      <Sidebar isOpen={mobileMenuOpen} isMobile onClose={() => setMobileMenuOpen(false)} />

      {/* Desktop Sidebar */}
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
          {/* Hero Section */}
          <section>
            <HeroSection
              gradient="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600"
              title="Community Discussions"
              description="Connect with designers, share ideas, and get feedback from the community."
              primaryButton={
                <Button onClick={() => setCreateModalOpen(true)} className="rounded-2xl bg-white text-orange-700 hover:bg-white/90">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Start Discussion
                </Button>
              }
            />
          </section>

          {/* Filter & Search */}
          <section>
            <FilterButtons
              activeSort={activeSort}
              onSortChange={setActiveSort}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </section>

          {/* Threads Grid */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              {activeCategory
                ? `${getCategoryName(activeCategory)} Discussions`
                : activeSort === 'hot'
                ? 'Hot Discussions'
                : activeSort === 'top'
                ? 'Top Discussions'
                : activeSort === 'discussed'
                ? 'Most Discussed'
                : 'Latest Discussions'}
              {filteredDiscussions.length > 0 && ` (${filteredDiscussions.length})`}
            </h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {/* Threads List */}
              <div className="space-y-3 lg:col-span-2">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredDiscussions.length === 0 ? (
                  <Card className="rounded-2xl p-8 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-semibold mb-2">
                      {discussions.length === 0 ? 'No discussions yet' : 'No matching discussions'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {discussions.length === 0
                        ? 'Be the first to start a discussion!'
                        : 'Try adjusting your filters or search query'}
                    </p>
                  </Card>
                ) : (
                  filteredDiscussions.map((thread) => (
                    <ThreadCard
                      key={thread.id}
                      thread={thread}
                      onVote={handleVote}
                      currentUserId={currentUserId}
                      onCommentAdded={fetchDiscussions}
                      onThreadClick={handleOpenThread}
                    />
                  ))
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Create Thread Card */}
                <CreateThreadModal
                  onThreadCreated={fetchDiscussions}
                  isOpen={createModalOpen}
                  setIsOpen={setCreateModalOpen}
                />

                {/* Categories */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Categories</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {CATEGORIES.map((cat) => (
                      <motion.button
                        key={cat.id}
                        whileHover={{ x: 4 }}
                        className="flex w-full items-center gap-2 rounded-lg p-2 transition-colors hover:bg-muted"
                      >
                        <div
                          className={`h-2 w-2 rounded-full ${cat.color}`}
                        />
                        <span className="text-sm">{cat.name}</span>
                      </motion.button>
                    ))}
                  </CardContent>
                </Card>

                {/* Community Stats */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Community Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Threads</span>
                      <span className="font-semibold">{totalThreads}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Votes</span>
                      <span className="font-semibold">
                        {discussions.reduce((sum, d) => sum + d.upvotes + d.downvotes, 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Comments</span>
                      <span className="font-semibold">
                        {discussions.reduce((sum, d) => sum + d.comment_count, 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Thread Modal */}
      {selectedThread && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
          onClick={handleCloseModal}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl my-8 relative"
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseModal}
              className="absolute -top-2 -right-2 z-10 rounded-full h-10 w-10 p-0 bg-background shadow-lg hover:bg-muted"
            >
              ✕
            </Button>

            {/* Thread Content */}
            <ThreadCard
              thread={selectedThread}
              onVote={handleVote}
              currentUserId={currentUserId}
              onCommentAdded={fetchDiscussions}
            />
          </motion.div>
        </motion.div>
      )}
    </main>
  )
}