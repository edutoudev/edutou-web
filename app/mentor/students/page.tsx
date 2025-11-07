'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/platform/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search, Users, Trophy, Target, TrendingUp, ArrowLeft, MessageSquare, Star, Mail, Plus, Minus } from 'lucide-react';
import { adjustPointsManual } from '@/utils/points';
import { getRankFromPoints } from '@/lib/ranks';
import { cn } from '@/lib/utils';

interface AssignedStudent {
  id: string;
  full_name: string;
  email: string;
  leaderboard_points: number;
  assigned_at: string;
  created_at: string;
  stats?: {
    total_points: number;
  };
}

interface Feedback {
  id: string;
  rating: number;
  title?: string;
  message: string;
  created_at: string;
  student_name: string;
}

export default function MentorStudentsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [students, setStudents] = useState<AssignedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mentorFeedback, setMentorFeedback] = useState<Feedback[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<AssignedStudent | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [studentStats, setStudentStats] = useState<any>(null);
  const [pointsAmount, setPointsAmount] = useState<number>(10);
  const [adjustingPoints, setAdjustingPoints] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current user (mentor)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get mentor assignments for this mentor
      const { data: assignments, error: assignmentsError } = await supabase
        .from('mentor_assignments')
        .select('student_id, assigned_at')
        .eq('mentor_id', user.id)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false });

      if (assignmentsError && assignmentsError.code !== 'PGRST116' && assignmentsError.code !== '42P01') {
        console.error('Assignments error:', assignmentsError);
      }

      if (!assignments || assignments.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = assignments.map((a: any) => a.student_id);

      // Get student profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, leaderboard_points, created_at')
        .in('id', studentIds);

      if (profilesError) throw profilesError;

      // Get leaderboard stats for all students
      const { data: leaderboardStats, error: leaderboardError } = await supabase
        .from('leaderboard')
        .select('*')
        .in('user_id', studentIds);

      if (leaderboardError && leaderboardError.code !== 'PGRST116' && leaderboardError.code !== '42P01') {
        console.error('Leaderboard error:', leaderboardError);
      }

      // Create maps for easy lookup
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const statsMap = new Map((leaderboardStats || []).map((s: any) => [s.user_id, s]));
      const assignmentDateMap = new Map(assignments.map((a: any) => [a.student_id, a.assigned_at]));

      // Combine all data
      const studentsWithStats = studentIds.map((studentId: string) => {
        const profile = profileMap.get(studentId);
        const stats = statsMap.get(studentId);
        const assignedAt = assignmentDateMap.get(studentId);

        return {
          id: studentId,
          full_name: profile?.full_name || 'No Name',
          email: profile?.email || '',
          leaderboard_points: profile?.leaderboard_points || 0,
          assigned_at: assignedAt,
          created_at: profile?.created_at || '',
          stats: stats ? {
            total_points: stats.total_points || 0,
          } : undefined,
        };
      });

      setStudents(studentsWithStats);

      // Load feedback for this mentor
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('id, student_id, rating, title, message, created_at')
        .eq('feedback_type', 'mentor')
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false });

      if (feedbackError && feedbackError.code !== 'PGRST116' && feedbackError.code !== '42P01') {
        console.error('Feedback error:', feedbackError);
      }

      // Get student names for feedback
      if (feedbackData && feedbackData.length > 0) {
        const feedbackStudentIds = feedbackData.map(f => f.student_id);
        const { data: students } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', feedbackStudentIds);

        const studentMap = new Map((students || []).map(s => [s.id, s.full_name]));

        const feedbackWithNames = feedbackData.map(f => ({
          ...f,
          student_name: studentMap.get(f.student_id) || 'Unknown'
        }));

        setMentorFeedback(feedbackWithNames);
      }
    } catch (error) {
      console.error('Error loading assigned students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentDetails = async (student: AssignedStudent) => {
    try {
      setLoadingDetails(true);
      setSelectedStudent(student);

      // Load detailed stats if not already loaded
      if (!student.stats) {
        const { data: stats } = await supabase
          .from('leaderboard')
          .select('*')
          .eq('user_id', student.id)
          .maybeSingle();

        setStudentStats(stats || {
          total_points: 0,
        });
      } else {
        setStudentStats(student.stats);
      }
    } catch (error) {
      console.error('Error loading student details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAdjustPoints = async (operation: 'add' | 'subtract') => {
    if (!selectedStudent || !pointsAmount || pointsAmount <= 0) {
      alert('Please enter a valid points amount');
      return;
    }

    try {
      setAdjustingPoints(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in');
        return;
      }

      const actualPoints = operation === 'subtract' ? -pointsAmount : pointsAmount;
      const actionType = operation === 'add' ? 'manual_points_add' : 'manual_points_subtract';

      // Manually adjust points (can be positive or negative)
      const result = await adjustPointsManual({
        userId: selectedStudent.id,
        actionType: actionType as any,
        points: actualPoints,
        referenceId: user.id,
        referenceType: 'mentor_adjustment',
        description: `Manual ${operation === 'add' ? 'addition' : 'subtraction'} of ${Math.abs(actualPoints)} points by mentor`
      });

      if (result.success) {
        // Update leaderboard table
        const { data: leaderboardEntry } = await supabase
          .from('leaderboard')
          .select('*')
          .eq('user_id', selectedStudent.id)
          .maybeSingle();

        if (leaderboardEntry) {
          // Update existing leaderboard entry
          await supabase
            .from('leaderboard')
            .update({
              total_points: (leaderboardEntry.total_points || 0) + actualPoints,
              bonus_points: (leaderboardEntry.bonus_points || 0) + actualPoints,
              last_activity: new Date().toISOString(),
            })
            .eq('user_id', selectedStudent.id);
        } else {
          // Create new leaderboard entry
          await supabase
            .from('leaderboard')
            .insert({
              user_id: selectedStudent.id,
              total_points: actualPoints,
              quiz_points: 0,
              assignment_points: 0,
              bonus_points: actualPoints,
              quizzes_completed: 0,
              correct_answers: 0,
              total_attempts: 0,
              last_activity: new Date().toISOString(),
            });
        }

        // Update local state
        const newPoints = selectedStudent.leaderboard_points + actualPoints;
        setSelectedStudent({
          ...selectedStudent,
          leaderboard_points: newPoints
        });

        // Update students list
        setStudents(students.map(s =>
          s.id === selectedStudent.id
            ? { ...s, leaderboard_points: newPoints }
            : s
        ));

        // Update student stats if loaded
        if (studentStats) {
          setStudentStats({
            ...studentStats,
            total_points: (studentStats.total_points || 0) + actualPoints,
          });
        }

        alert(`Successfully ${operation === 'add' ? 'added' : 'subtracted'} ${pointsAmount} points!`);
      } else {
        alert(`Failed to adjust points: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adjusting points:', error);
      alert('An error occurred while adjusting points');
    } finally {
      setAdjustingPoints(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    if (!name) return 'ST';
    const names = name.trim().split(/\s+/);
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-3 h-3",
              star <= count ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            )}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black reading:bg-amber-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <main className="overflow-hidden bg-slate-50 dark:bg-black reading:bg-amber-50 min-h-screen">
      {/* Mobile Sidebar */}
      <Sidebar isOpen={mobileMenuOpen} isMobile onClose={() => setMobileMenuOpen(false)} />

      {/* Desktop Sidebar */}
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

        <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {!selectedStudent ? (
        <>
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              My Students
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View and track your assigned students' progress
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Students */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{students.length}</p>
                      </div>
                      <Users className="w-10 h-10 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Points</p>
                        <p className="text-3xl font-bold text-purple-600">
                          {students.reduce((sum, s) => sum + (s.stats?.total_points || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <Trophy className="w-10 h-10 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search */}
              <Card>
                <CardContent className="p-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search students by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Students List */}
              {filteredStudents.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {students.length === 0 ? 'No Students Assigned' : 'No Students Found'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {students.length === 0
                        ? "You don't have any students assigned yet. Contact admin for student assignments."
                        : 'Try adjusting your search query'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredStudents.map((student) => {
                    const rank = getRankFromPoints(student.leaderboard_points);

                    return (
                      <Card
                        key={student.id}
                        className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => loadStudentDetails(student)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-16 h-16 border-2 border-gray-200 dark:border-gray-700">
                              <AvatarFallback className="text-lg bg-gradient-to-br from-blue-600 to-cyan-600 text-white font-semibold">
                                {getInitials(student.full_name)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                    {student.full_name}
                                  </h3>
                                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                    <Mail className="w-3 h-3" />
                                    <span className="truncate">{student.email}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="mb-3">
                                <Badge className={`bg-gradient-to-r ${rank.gradient} text-white border-none`}>
                                  <span className="mr-1">{rank.emoji}</span>
                                  {rank.name}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                                  <p className="text-xs text-blue-600 dark:text-blue-400">Total Points</p>
                                  <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                    {student.stats?.total_points.toLocaleString() || 0}
                                  </p>
                                </div>

                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                                  <p className="text-xs text-purple-600 dark:text-purple-400">Leaderboard Points</p>
                                  <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                                    {student.leaderboard_points.toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                                Assigned: {new Date(student.assigned_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column - Feedback */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Student Feedback
                  </CardTitle>
                  <CardDescription>
                    Feedback from your students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {mentorFeedback.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm">No feedback yet</p>
                      </div>
                    ) : (
                      mentorFeedback.map((feedback) => (
                        <div
                          key={feedback.id}
                          className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {feedback.student_name}
                            </span>
                            {renderStars(feedback.rating)}
                          </div>
                          {feedback.title && (
                            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {feedback.title}
                            </h4>
                          )}
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {feedback.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(feedback.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Student Details View */}
          <div>
            <Button
              variant="ghost"
              onClick={() => setSelectedStudent(null)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Students
            </Button>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Student Profile */}
                <Card>
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-start gap-6">
                      <Avatar className="w-24 h-24 border-4 border-blue-100 dark:border-blue-900">
                        <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white font-bold">
                          {getInitials(selectedStudent.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedStudent.full_name}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">{selectedStudent.email}</p>

                        <div className="mt-4">
                          {(() => {
                            const rank = getRankFromPoints(selectedStudent.leaderboard_points);
                            return (
                              <Badge className={`bg-gradient-to-r ${rank.gradient} text-white border-none`}>
                                {rank.emoji} {rank.name}
                              </Badge>
                            );
                          })()}
                        </div>

                        <p className="text-sm text-gray-500 mt-3">
                          Assigned: {new Date(selectedStudent.assigned_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats */}
                {studentStats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <Trophy className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total Points</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {studentStats.total_points?.toLocaleString() || 0}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">Leaderboard Points</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {selectedStudent.leaderboard_points.toLocaleString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Manual Points Adjustment */}
                <Card className="border-2 border-blue-200 dark:border-blue-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Trophy className="w-5 h-5" />
                      Manual Points Adjustment
                    </CardTitle>
                    <CardDescription>
                      Add or subtract points manually for this student
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Current Points Display */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Leaderboard Points</p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                          {selectedStudent.leaderboard_points.toLocaleString()}
                        </p>
                      </div>

                      {/* Points Amount Input */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Points Amount
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="1000"
                          value={pointsAmount}
                          onChange={(e) => setPointsAmount(parseInt(e.target.value) || 0)}
                          className="text-lg font-semibold text-center"
                          placeholder="Enter points amount"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Enter the number of points to add or subtract (1-1000)
                        </p>
                      </div>

                      {/* Quick Amount Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400 w-full mb-1">Quick amounts:</p>
                        {[5, 10, 25, 50, 100, 500].map((amount) => (
                          <Button
                            key={amount}
                            variant="outline"
                            size="sm"
                            onClick={() => setPointsAmount(amount)}
                            className="rounded-xl"
                          >
                            {amount}
                          </Button>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <Button
                          onClick={() => handleAdjustPoints('add')}
                          disabled={adjustingPoints || !pointsAmount || pointsAmount <= 0}
                          className="h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
                        >
                          {adjustingPoints ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-5 h-5 mr-2" />
                              Add {pointsAmount} Points
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={() => handleAdjustPoints('subtract')}
                          disabled={adjustingPoints || !pointsAmount || pointsAmount <= 0}
                          className="h-12 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold"
                        >
                          {adjustingPoints ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <Minus className="w-5 h-5 mr-2" />
                              Subtract {pointsAmount} Points
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Warning */}
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200">
                          ⚠️ Manual point adjustments will be tracked in the student's points history and cannot be undone.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </>
      )}
        </div>
      </div>
    </main>
  );
}
