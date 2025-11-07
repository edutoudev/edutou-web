'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  Search,
  Trash2,
  MessageSquare,
  Calendar,
  User,
  Settings,
  Save,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface Discussion {
  id: string
  title: string
  content: string
  category: string
  created_at: string
  author_id: string
  author_name: string
  author_email: string
  comment_count: number
}

interface Comment {
  id: string
  content: string
  created_at: string
  discussion_id: string
  discussion_title: string
  author_id: string
  author_name: string
  author_email: string
}

interface PointsConfig {
  discussion_create: number
  discussion_comment: number
}

export default function ManageDiscussionsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pointsConfig, setPointsConfig] = useState<PointsConfig>({
    discussion_create: 100,
    discussion_comment: 50
  })
  const [savingPoints, setSavingPoints] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Check if user is admin or mentor
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || !['admin', 'mentor'].includes(profile.role)) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access this page',
          variant: 'destructive'
        })
        return
      }

      // Load discussions with author info
      const { data: discussionsData, error: discussionsError } = await supabase
        .from('discussions')
        .select(`
          id,
          title,
          content,
          category,
          created_at,
          author_id,
          profiles!discussions_author_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })

      if (discussionsError) throw discussionsError

      // Get comment counts
      const { data: commentCounts } = await supabase
        .from('discussion_comments')
        .select('discussion_id')

      const countMap = new Map<string, number>()
      commentCounts?.forEach(comment => {
        countMap.set(comment.discussion_id, (countMap.get(comment.discussion_id) || 0) + 1)
      })

      const formattedDiscussions = (discussionsData || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        content: d.content,
        category: d.category,
        created_at: d.created_at,
        author_id: d.author_id,
        author_name: d.profiles?.full_name || 'Unknown',
        author_email: d.profiles?.email || '',
        comment_count: countMap.get(d.id) || 0
      }))

      setDiscussions(formattedDiscussions)

      // Load comments with author and discussion info
      const { data: commentsData, error: commentsError } = await supabase
        .from('discussion_comments')
        .select(`
          id,
          content,
          created_at,
          discussion_id,
          author_id,
          profiles!discussion_comments_author_id_fkey(full_name, email),
          discussions!discussion_comments_discussion_id_fkey(title)
        `)
        .order('created_at', { ascending: false })

      if (commentsError) throw commentsError

      const formattedComments = (commentsData || []).map((c: any) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        discussion_id: c.discussion_id,
        discussion_title: c.discussions?.title || 'Unknown',
        author_id: c.author_id,
        author_name: c.profiles?.full_name || 'Unknown',
        author_email: c.profiles?.email || ''
      }))

      setComments(formattedComments)

      // Load points configuration
      const { data: pointsData } = await supabase
        .from('points_config')
        .select('action_type, points')
        .in('action_type', ['discussion_create', 'discussion_comment'])

      if (pointsData) {
        const config: any = {}
        pointsData.forEach(p => {
          config[p.action_type] = p.points
        })
        setPointsConfig(config)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load discussions',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteDiscussion = async (discussionId: string) => {
    if (!confirm('Are you sure you want to delete this discussion? This will also delete all comments.')) {
      return
    }

    try {
      setDeletingId(discussionId)

      // Delete comments first
      await supabase
        .from('discussion_comments')
        .delete()
        .eq('discussion_id', discussionId)

      // Delete discussion
      const { error } = await supabase
        .from('discussions')
        .delete()
        .eq('id', discussionId)

      if (error) throw error

      setDiscussions(discussions.filter(d => d.id !== discussionId))
      setComments(comments.filter(c => c.discussion_id !== discussionId))

      toast({
        title: 'Success',
        description: 'Discussion deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting discussion:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete discussion',
        variant: 'destructive'
      })
    } finally {
      setDeletingId(null)
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return
    }

    try {
      setDeletingId(commentId)

      const { error } = await supabase
        .from('discussion_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      setComments(comments.filter(c => c.id !== commentId))

      // Update comment count
      const comment = comments.find(c => c.id === commentId)
      if (comment) {
        setDiscussions(discussions.map(d =>
          d.id === comment.discussion_id
            ? { ...d, comment_count: d.comment_count - 1 }
            : d
        ))
      }

      toast({
        title: 'Success',
        description: 'Comment deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive'
      })
    } finally {
      setDeletingId(null)
    }
  }

  const savePointsConfig = async () => {
    try {
      setSavingPoints(true)

      // Update discussion_create points
      const { error: error1 } = await supabase
        .from('points_config')
        .update({ points: pointsConfig.discussion_create })
        .eq('action_type', 'discussion_create')

      if (error1) throw error1

      // Update discussion_comment points
      const { error: error2 } = await supabase
        .from('points_config')
        .update({ points: pointsConfig.discussion_comment })
        .eq('action_type', 'discussion_comment')

      if (error2) throw error2

      toast({
        title: 'Success',
        description: 'Points configuration updated successfully'
      })
    } catch (error) {
      console.error('Error saving points config:', error)
      toast({
        title: 'Error',
        description: 'Failed to update points configuration',
        variant: 'destructive'
      })
    } finally {
      setSavingPoints(false)
    }
  }

  const filteredDiscussions = discussions.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.author_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredComments = comments.filter(c =>
    c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.author_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.discussion_title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getInitials = (name: string) => {
    if (!name) return 'U'
    const names = name.split(' ')
    return names.length >= 2
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <main className="overflow-hidden bg-slate-50 dark:bg-black min-h-screen">
      <Sidebar isOpen={mobileMenuOpen} isMobile onClose={() => setMobileMenuOpen(false)} />
      <Sidebar isOpen={sidebarOpen} />

      <div className={cn('min-h-screen transition-all duration-300', sidebarOpen ? 'md:pl-64' : 'md:pl-0')}>
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <div className="container mx-auto p-6 max-w-7xl space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Manage Discussions
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Moderate discussions, comments, and configure points
            </p>
          </div>

          <Tabs defaultValue="discussions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="discussions">Discussions</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="settings">Points Settings</TabsTrigger>
            </TabsList>

            {/* Discussions Tab */}
            <TabsContent value="discussions" className="space-y-4">
              {/* Search */}
              <Card>
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search discussions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Discussions</p>
                        <p className="text-3xl font-bold text-blue-600">{discussions.length}</p>
                      </div>
                      <MessageSquare className="w-10 h-10 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Comments</p>
                        <p className="text-3xl font-bold text-green-600">{comments.length}</p>
                      </div>
                      <MessageSquare className="w-10 h-10 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
                        <p className="text-3xl font-bold text-purple-600">
                          {new Set([...discussions.map(d => d.author_id), ...comments.map(c => c.author_id)]).size}
                        </p>
                      </div>
                      <User className="w-10 h-10 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Discussions List */}
              <div className="space-y-3">
                {filteredDiscussions.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        No Discussions Found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {searchQuery ? 'Try adjusting your search' : 'No discussions have been created yet'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredDiscussions.map((discussion) => (
                    <Card key={discussion.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <Avatar className="w-12 h-12 flex-shrink-0">
                              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white font-semibold">
                                {getInitials(discussion.author_name)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                {discussion.title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                                {discussion.content}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {discussion.author_name}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(discussion.created_at).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  {discussion.comment_count} comments
                                </div>
                                <Badge variant="outline">{discussion.category}</Badge>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteDiscussion(discussion.id)}
                            disabled={deletingId === discussion.id}
                          >
                            {deletingId === discussion.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="space-y-4">
              {/* Search */}
              <Card>
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search comments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Comments List */}
              <div className="space-y-3">
                {filteredComments.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        No Comments Found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {searchQuery ? 'Try adjusting your search' : 'No comments have been posted yet'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredComments.map((comment) => (
                    <Card key={comment.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <Avatar className="w-10 h-10 flex-shrink-0">
                              <AvatarFallback className="bg-gradient-to-br from-green-600 to-emerald-600 text-white font-semibold">
                                {getInitials(comment.author_name)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-3">
                                {comment.content}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {comment.author_name}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  On: {comment.discussion_title}
                                </div>
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteComment(comment.id)}
                            disabled={deletingId === comment.id}
                          >
                            {deletingId === comment.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Points Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Points Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure how many points students earn for discussion activities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Discussion Create Points */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Creating a Discussion
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Points awarded when a student starts a new discussion thread
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="1000"
                          value={pointsConfig.discussion_create}
                          onChange={(e) => setPointsConfig({
                            ...pointsConfig,
                            discussion_create: parseInt(e.target.value) || 0
                          })}
                          className="w-24 text-center"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">points</span>
                      </div>
                    </div>
                    <div className="h-px bg-gray-200 dark:bg-gray-700" />
                  </div>

                  {/* Discussion Comment Points */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Commenting on a Discussion
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Points awarded when a student comments on a discussion
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="1000"
                          value={pointsConfig.discussion_comment}
                          onChange={(e) => setPointsConfig({
                            ...pointsConfig,
                            discussion_comment: parseInt(e.target.value) || 0
                          })}
                          className="w-24 text-center"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">points</span>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      onClick={loadData}
                      variant="outline"
                      disabled={savingPoints}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                    <Button
                      onClick={savePointsConfig}
                      disabled={savingPoints}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    >
                      {savingPoints ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Info Box */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      💡 <strong>Note:</strong> Changes will apply to all new discussions and comments.
                      Existing point awards will not be affected.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}
