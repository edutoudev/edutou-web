'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/platform/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  Plus,
  MessageSquare,
  Calendar,
  Trash2,
  Edit,
  Eye,
  Star,
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

interface FeedbackSession {
  id: string;
  title: string;
  description: string;
  session_type: string;
  status: 'active' | 'closed' | 'draft';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  allow_anonymous: boolean;
  require_rating: boolean;
  max_submissions_per_user: number;
  response_count?: number;
  avg_rating?: number;
}

interface FeedbackResponse {
  id: string;
  session_id: string;
  user_id: string | null;
  rating: number;
  title: string | null;
  message: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export default function AdminManageFeedbackPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<FeedbackSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<FeedbackSession | null>(null);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResponsesDialog, setShowResponsesDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    session_type: 'workshop',
    status: 'active' as 'active' | 'closed' | 'draft',
    start_date: '',
    end_date: '',
    allow_anonymous: false,
    require_rating: true,
    max_submissions_per_user: 1,
  });

  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    checkAccess();
    loadSessions();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/');
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);

      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('feedback_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionsError) {
        if (sessionsError.code === '42P01') {
          toast({
            title: 'Database Setup Required',
            description: 'Please run feedback_sessions_schema.sql in your Supabase SQL editor',
            variant: 'destructive',
          });
          setSessions([]);
          return;
        }
        throw sessionsError;
      }

      // Get response counts and average ratings for each session
      const sessionsWithStats = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { count } = await supabase
            .from('session_feedback_responses')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          const { data: ratingData } = await supabase
            .from('session_feedback_responses')
            .select('rating')
            .eq('session_id', session.id);

          const avgRating =
            ratingData && ratingData.length > 0
              ? ratingData.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingData.length
              : 0;

          return {
            ...session,
            response_count: count || 0,
            avg_rating: avgRating,
          };
        })
      );

      setSessions(sessionsWithStats);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feedback sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a session title',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('feedback_sessions')
        .insert({
          ...formData,
          created_by: user.id,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Feedback session created successfully',
      });

      setShowCreateDialog(false);
      resetForm();
      await loadSessions();
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to create feedback session',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback session? All responses will also be deleted.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('feedback_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Feedback session deleted',
      });

      await loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete feedback session',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (id: string, status: 'active' | 'closed' | 'draft') => {
    try {
      const { error } = await supabase
        .from('feedback_sessions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Session ${status === 'closed' ? 'closed' : status === 'active' ? 'activated' : 'set to draft'}`,
      });

      await loadSessions();
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to update session status',
        variant: 'destructive',
      });
    }
  };

  const loadResponses = async (session: FeedbackSession) => {
    try {
      setLoadingResponses(true);
      setSelectedSession(session);
      setShowResponsesDialog(true);

      const { data: responsesData, error } = await supabase
        .from('session_feedback_responses')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user names for non-anonymous responses
      const userIds = responsesData
        ?.filter((r) => r.user_id)
        .map((r) => r.user_id) || [];

      let userMap = new Map();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        userMap = new Map(users?.map((u) => [u.id, { name: u.full_name, email: u.email }]) || []);
      }

      const responsesWithUsers = responsesData?.map((response) => ({
        ...response,
        user_name: response.user_id ? userMap.get(response.user_id)?.name : 'Anonymous',
        user_email: response.user_id ? userMap.get(response.user_id)?.email : null,
      })) || [];

      setResponses(responsesWithUsers);
    } catch (error) {
      console.error('Error loading responses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load responses',
        variant: 'destructive',
      });
    } finally {
      setLoadingResponses(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      session_type: 'workshop',
      status: 'active',
      start_date: '',
      end_date: '',
      allow_anonymous: false,
      require_rating: true,
      max_submissions_per_user: 1,
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'w-4 h-4',
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            )}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      closed: { label: 'Closed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <main className="overflow-hidden bg-slate-50 dark:bg-black reading:bg-amber-50 min-h-screen">
      <Sidebar isOpen={mobileMenuOpen} isMobile onClose={() => setMobileMenuOpen(false)} />
      <Sidebar isOpen={sidebarOpen} />

      <div
        className={cn(
          'min-h-screen transition-all duration-300',
          sidebarOpen ? 'md:pl-64' : 'md:pl-0'
        )}
      >
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                Manage Feedback Sessions
              </h1>
              <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700 mt-1">
                Create and manage feedback sessions for events, workshops, and programs
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-cyan-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Session
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Feedback Session</DialogTitle>
                  <DialogDescription>
                    Create a new session for collecting feedback from users
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSession} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Session Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., React Workshop - January 2024"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what this feedback session is for..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Session Type</Label>
                      <Select
                        value={formData.session_type}
                        onValueChange={(value) => setFormData({ ...formData, session_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="course">Course</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="program">Program</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date (Optional)</Label>
                      <Input
                        id="start_date"
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date (Optional)</Label>
                      <Input
                        id="end_date"
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_submissions">Max Submissions Per User</Label>
                    <Input
                      id="max_submissions"
                      type="number"
                      min="1"
                      value={formData.max_submissions_per_user}
                      onChange={(e) =>
                        setFormData({ ...formData, max_submissions_per_user: parseInt(e.target.value) })
                      }
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allow_anonymous"
                      checked={formData.allow_anonymous}
                      onChange={(e) => setFormData({ ...formData, allow_anonymous: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="allow_anonymous" className="cursor-pointer">
                      Allow anonymous feedback
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="require_rating"
                      checked={formData.require_rating}
                      onChange={(e) => setFormData({ ...formData, require_rating: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="require_rating" className="cursor-pointer">
                      Require rating
                    </Label>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Session'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Sessions List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No feedback sessions yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                  Create your first feedback session to start collecting feedback
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session) => (
                <Card key={session.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-lg">{session.title}</CardTitle>
                      {getStatusBadge(session.status)}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {session.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{session.response_count} responses</span>
                      </div>
                      {session.avg_rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-gray-900 dark:text-gray-100 font-medium">
                            {session.avg_rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(session.created_at).toLocaleDateString()}</span>
                      <Badge variant="outline" className="ml-auto capitalize text-xs">
                        {session.session_type}
                      </Badge>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => loadResponses(session)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>

                      {session.status === 'active' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(session.id, 'closed')}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Close
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(session.id, 'active')}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Activate
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Responses Dialog */}
          <Dialog open={showResponsesDialog} onOpenChange={setShowResponsesDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedSession?.title}</DialogTitle>
                <DialogDescription>
                  Feedback responses ({responses.length} total)
                </DialogDescription>
              </DialogHeader>
              {loadingResponses ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : responses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No responses yet</p>
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  {responses.map((response) => (
                    <div
                      key={response.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {response.user_name}
                          </p>
                          {response.user_email && (
                            <p className="text-xs text-gray-500">{response.user_email}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {renderStars(response.rating)}
                          <span className="text-xs text-gray-500">
                            {new Date(response.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {response.title && (
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {response.title}
                        </h4>
                      )}
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {response.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </main>
  );
}
