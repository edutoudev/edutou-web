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
import { Loader2, MessageSquare, Star, Send, Calendar, Users, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface Mentor {
  id: string;
  full_name: string;
}

interface Feedback {
  id: string;
  feedback_type: string;
  mentor_id?: string;
  mentor_name?: string;
  rating: number;
  title: string;
  message: string;
  created_at: string;
}

interface FeedbackSession {
  id: string;
  title: string;
  description: string;
  session_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  allow_anonymous: boolean;
  require_rating: boolean;
  max_submissions_per_user: number;
  response_count?: number;
  avg_rating?: number;
  user_has_responded?: boolean;
}

export default function FeedbackPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [myFeedback, setMyFeedback] = useState<Feedback[]>([]);
  const [sessions, setSessions] = useState<FeedbackSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<FeedbackSession | null>(null);
  const [showSessionDialog, setShowSessionDialog] = useState(false);

  // Form state for general feedback
  const [feedbackType, setFeedbackType] = useState<'platform' | 'mentor' | 'program'>('platform');
  const [selectedMentor, setSelectedMentor] = useState<string>('');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  // Form state for session feedback
  const [sessionRating, setSessionRating] = useState(0);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');

  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    loadSessions();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load mentors for dropdown
      const { data: mentorsData, error: mentorsError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'mentor')
        .order('full_name');

      if (mentorsError) throw mentorsError;
      setMentors(mentorsData || []);

      // Load user's feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (feedbackError && feedbackError.code !== 'PGRST116' && feedbackError.code !== '42P01') {
        console.error('Feedback error:', feedbackError);
      }

      // Get mentor names for feedback
      if (feedbackData && feedbackData.length > 0) {
        const mentorIds = feedbackData
          .filter(f => f.mentor_id)
          .map(f => f.mentor_id);

        if (mentorIds.length > 0) {
          const { data: mentorNames } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', mentorIds);

          const mentorMap = new Map((mentorNames || []).map(m => [m.id, m.full_name]));

          const feedbackWithNames = feedbackData.map(f => ({
            ...f,
            mentor_name: f.mentor_id ? mentorMap.get(f.mentor_id) : undefined
          }));

          setMyFeedback(feedbackWithNames);
        } else {
          setMyFeedback(feedbackData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feedback data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your feedback message',
        variant: 'destructive',
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: 'Error',
        description: 'Please select a rating',
        variant: 'destructive',
      });
      return;
    }

    if (feedbackType === 'mentor' && !selectedMentor) {
      toast({
        title: 'Error',
        description: 'Please select a mentor',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const feedbackData: any = {
        student_id: user.id,
        feedback_type: feedbackType,
        rating,
        title: title.trim() || null,
        message: message.trim(),
      };

      if (feedbackType === 'mentor') {
        feedbackData.mentor_id = selectedMentor;
      }

      const { error } = await supabase
        .from('feedback')
        .insert(feedbackData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Your feedback has been submitted',
      });

      // Reset form
      setTitle('');
      setMessage('');
      setRating(0);
      setSelectedMentor('');

      // Reload feedback
      await loadData();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };


  const loadSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load active sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('feedback_sessions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (sessionsError) {
        if (sessionsError.code !== '42P01') {
          console.error('Sessions error:', sessionsError);
        }
        return;
      }

      // Check which sessions user has responded to
      const sessionIds = sessionsData?.map((s) => s.id) || [];
      if (sessionIds.length > 0) {
        const { data: responses } = await supabase
          .from('session_feedback_responses')
          .select('session_id')
          .eq('user_id', user.id)
          .in('session_id', sessionIds);

        const respondedSessionIds = new Set(responses?.map((r) => r.session_id) || []);

        const sessionsWithStatus = sessionsData?.map((session) => ({
          ...session,
          user_has_responded: respondedSessionIds.has(session.id),
        })) || [];

        setSessions(sessionsWithStatus);
      } else {
        setSessions(sessionsData || []);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleSessionFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSession) return;

    if (!sessionMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your feedback message',
        variant: 'destructive',
      });
      return;
    }

    if (selectedSession.require_rating && sessionRating === 0) {
      toast({
        title: 'Error',
        description: 'Please select a rating',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user && !selectedSession.allow_anonymous) {
        throw new Error('Not authenticated');
      }

      const responseData: any = {
        session_id: selectedSession.id,
        user_id: selectedSession.allow_anonymous ? null : user?.id,
        rating: sessionRating,
        title: sessionTitle.trim() || null,
        message: sessionMessage.trim(),
      };

      const { error } = await supabase
        .from('session_feedback_responses')
        .insert(responseData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Your feedback has been submitted',
      });

      // Reset form
      setSessionTitle('');
      setSessionMessage('');
      setSessionRating(0);
      setShowSessionDialog(false);
      setSelectedSession(null);

      // Reload sessions
      await loadSessions();
    } catch (error: any) {
      console.error('Error submitting session feedback:', error);

      if (error.code === '23505') {
        toast({
          title: 'Error',
          description: 'You have already submitted feedback for this session',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to submit feedback',
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openSessionDialog = (session: FeedbackSession) => {
    setSelectedSession(session);
    setSessionRating(0);
    setSessionTitle('');
    setSessionMessage('');
    setShowSessionDialog(true);
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-4 h-4",
              star <= count ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <main className="overflow-hidden bg-slate-50 dark:bg-black min-h-screen transition-colors duration-300">
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="container mx-auto p-6 max-w-6xl space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Feedback
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Share your thoughts about sessions, the platform, your mentor, or the program
              </p>
            </div>

            <Tabs defaultValue="sessions" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="sessions">Feedback Sessions</TabsTrigger>
                <TabsTrigger value="general">General Feedback</TabsTrigger>
              </TabsList>

              {/* Feedback Sessions Tab */}
              <TabsContent value="sessions" className="space-y-6">
                {sessions.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        No active feedback sessions
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-center">
                        Check back later for new sessions to provide feedback on
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sessions.map((session) => (
                      <Card key={session.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <CardTitle className="text-lg">{session.title}</CardTitle>
                            <Badge variant="outline" className="capitalize shrink-0">
                              {session.session_type}
                            </Badge>
                          </div>
                          <CardDescription className="line-clamp-2">
                            {session.description || 'No description'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {(session.start_date || session.end_date) && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {session.start_date && new Date(session.start_date).toLocaleDateString()}
                                {session.end_date && ` - ${new Date(session.end_date).toLocaleDateString()}`}
                              </span>
                            </div>
                          )}
                          {session.user_has_responded ? (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Feedback submitted</span>
                            </div>
                          ) : (
                            <Button
                              onClick={() => openSessionDialog(session)}
                              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Give Feedback
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* General Feedback Tab */}
              <TabsContent value="general">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Submit Feedback Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Submit Feedback
                  </CardTitle>
                  <CardDescription>
                    Help us improve by sharing your experience
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Feedback Type</Label>
                      <Select value={feedbackType} onValueChange={(value: any) => setFeedbackType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="platform">Platform</SelectItem>
                          <SelectItem value="mentor">My Mentor</SelectItem>
                          <SelectItem value="program">Overall Program</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {feedbackType === 'mentor' && (
                      <div className="space-y-2">
                        <Label>Select Mentor</Label>
                        <Select value={selectedMentor} onValueChange={setSelectedMentor}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a mentor" />
                          </SelectTrigger>
                          <SelectContent>
                            {mentors.map((mentor) => (
                              <SelectItem key={mentor.id} value={mentor.id}>
                                {mentor.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Rating *</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              className={cn(
                                "w-8 h-8",
                                star <= rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300 hover:text-yellow-200"
                              )}
                            />
                          </button>
                        ))}
                      </div>
                      {rating === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Please select a rating
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">Title (Optional)</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Brief summary of your feedback"
                        maxLength={200}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Share your detailed feedback here..."
                        rows={5}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Feedback
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* My Feedback History */}
              <Card>
                <CardHeader>
                  <CardTitle>My Feedback</CardTitle>
                  <CardDescription>
                    View and manage your submitted feedback
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {myFeedback.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>No feedback submitted yet</p>
                      </div>
                    ) : (
                      myFeedback.map((feedback) => (
                        <div
                          key={feedback.id}
                          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="capitalize">
                                  {feedback.feedback_type}
                                </Badge>
                                {renderStars(feedback.rating)}
                              </div>
                              {feedback.title && (
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  {feedback.title}
                                </h4>
                              )}
                              {feedback.mentor_name && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  For: {feedback.mentor_name}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {feedback.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(feedback.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
              </TabsContent>
            </Tabs>

            {/* Session Feedback Dialog */}
            <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedSession?.title}</DialogTitle>
                  <DialogDescription>
                    {selectedSession?.description || 'Share your feedback for this session'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSessionFeedbackSubmit} className="space-y-4 mt-4">
                  {selectedSession?.require_rating && (
                    <div className="space-y-2">
                      <Label>Rating *</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setSessionRating(star)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              className={cn(
                                'w-8 h-8',
                                star <= sessionRating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300 hover:text-yellow-200'
                              )}
                            />
                          </button>
                        ))}
                      </div>
                      {sessionRating === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Please select a rating
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="session_title">Title (Optional)</Label>
                    <Input
                      id="session_title"
                      value={sessionTitle}
                      onChange={(e) => setSessionTitle(e.target.value)}
                      placeholder="Brief summary of your feedback"
                      maxLength={200}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session_message">Message *</Label>
                    <Textarea
                      id="session_message"
                      value={sessionMessage}
                      onChange={(e) => setSessionMessage(e.target.value)}
                      placeholder="Share your detailed feedback here..."
                      rows={5}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowSessionDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Feedback
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </main>
  );
}
