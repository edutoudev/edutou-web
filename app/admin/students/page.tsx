'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/platform/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, Users, Trophy, Target, TrendingUp, ArrowLeft, MessageSquare, Star, Shield, UserCog } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getRankFromPoints } from '@/lib/ranks';

interface Student {
  id: string;
  full_name: string;
  email: string;
  role: string;
  leaderboard_points: number;
  assigned_mentor_id?: string;
  mentor_name?: string;
  created_at: string;
}

interface StudentStats {
  quizzes_completed: number;
  total_points: number;
  correct_answers: number;
  total_attempts: number;
}

interface Feedback {
  id: string;
  feedback_type: string;
  rating: number;
  title?: string;
  message: string;
  created_at: string;
  mentor_name?: string;
}

export default function AdminStudentsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [studentFeedback, setStudentFeedback] = useState<Feedback[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');

  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);

      // Load all users (students, mentors, admins, coursemasters)
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, leaderboard_points, created_at')
        .order('full_name');

      if (studentsError) throw studentsError;

      // Load mentor assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('mentor_assignments')
        .select('student_id, mentor_id')
        .eq('status', 'active');

      if (assignmentsError && assignmentsError.code !== 'PGRST116' && assignmentsError.code !== '42P01') {
        console.error('Assignments error:', assignmentsError);
      }

      // Load mentor names
      const mentorIds = Array.from(new Set((assignments || []).map(a => a.mentor_id)));
      let mentorMap = new Map();

      if (mentorIds.length > 0) {
        const { data: mentors } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', mentorIds);

        mentorMap = new Map((mentors || []).map(m => [m.id, m.full_name]));
      }

      const assignmentMap = new Map((assignments || []).map(a => [a.student_id, a.mentor_id]));

      const transformedStudents = (studentsData || []).map(student => ({
        ...student,
        full_name: student.full_name || 'No Name',
        leaderboard_points: student.leaderboard_points || 0,
        assigned_mentor_id: assignmentMap.get(student.id),
        mentor_name: assignmentMap.get(student.id) ? mentorMap.get(assignmentMap.get(student.id)) : undefined,
      }));

      setStudents(transformedStudents);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedStudent || !selectedRole) {
      toast({
        title: 'Error',
        description: 'Please select a role',
        variant: 'destructive',
      });
      return;
    }

    if (selectedRole === selectedStudent.role) {
      toast({
        title: 'No Change',
        description: 'User already has this role',
      });
      return;
    }

    try {
      setChangingRole(true);

      const { error } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Role changed to ${selectedRole} successfully`,
      });

      // Update local state
      setSelectedStudent({
        ...selectedStudent,
        role: selectedRole,
      });

      // Reload students list
      await loadStudents();
    } catch (error) {
      console.error('Error changing role:', error);
      toast({
        title: 'Error',
        description: 'Failed to change role',
        variant: 'destructive',
      });
    } finally {
      setChangingRole(false);
    }
  };

  const loadStudentDetails = async (student: Student) => {
    try {
      setLoadingDetails(true);
      setSelectedStudent(student);
      setSelectedRole(student.role);

      // Load leaderboard stats
      const { data: stats, error: statsError } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', student.id)
        .maybeSingle();

      if (statsError && statsError.code !== 'PGRST116' && statsError.code !== '42P01') {
        console.error('Stats error:', statsError);
      }

      setStudentStats(stats || {
        quizzes_completed: 0,
        total_points: 0,
        correct_answers: 0,
        total_attempts: 0,
      });

      // Load feedback submitted by this student
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      if (feedbackError && feedbackError.code !== 'PGRST116' && feedbackError.code !== '42P01') {
        console.error('Feedback error:', feedbackError);
      }

      // Get mentor names for mentor feedback
      if (feedbackData && feedbackData.length > 0) {
        const mentorIds = feedbackData
          .filter(f => f.mentor_id)
          .map(f => f.mentor_id);

        if (mentorIds.length > 0) {
          const { data: mentors } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', mentorIds);

          const mentorMap = new Map((mentors || []).map(m => [m.id, m.full_name]));

          const feedbackWithNames = feedbackData.map(f => ({
            ...f,
            mentor_name: f.mentor_id ? mentorMap.get(f.mentor_id) : undefined
          }));

          setStudentFeedback(feedbackWithNames);
        } else {
          setStudentFeedback(feedbackData);
        }
      } else {
        setStudentFeedback([]);
      }
    } catch (error) {
      console.error('Error loading student details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student details',
        variant: 'destructive',
      });
    } finally {
      setLoadingDetails(false);
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
          <div className="container mx-auto p-6 max-w-7xl space-y-6">
            {!selectedStudent ? (
              <>
                {/* Header */}
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    User Management
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    View and manage all users in the platform (Students, Mentors, Course Masters, Admins)
                  </p>
                </div>

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
                          <p className="text-sm text-gray-600 dark:text-gray-400">With Mentors</p>
                          <p className="text-3xl font-bold text-green-600">
                            {students.filter(s => s.assigned_mentor_id).length}
                          </p>
                        </div>
                        <Target className="w-10 h-10 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Without Mentors</p>
                          <p className="text-3xl font-bold text-orange-600">
                            {students.filter(s => !s.assigned_mentor_id).length}
                          </p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-orange-600" />
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

                {/* Students Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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
                            <Avatar className="w-14 h-14 border-2 border-gray-200 dark:border-gray-700">
                              <AvatarFallback className="text-lg bg-gradient-to-br from-blue-600 to-cyan-600 text-white font-semibold">
                                {getInitials(student.full_name)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                {student.full_name}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {student.email}
                              </p>

                              <div className="mt-2 flex items-center gap-2">
                                <Badge className={`bg-gradient-to-r ${rank.gradient} text-white border-none text-xs`}>
                                  {rank.emoji} {rank.name}
                                </Badge>
                              </div>

                              {student.mentor_name && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  Mentor: {student.mentor_name}
                                </p>
                              )}

                              <p className="text-sm font-semibold text-blue-600 mt-2">
                                {student.leaderboard_points.toLocaleString()} points
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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

                              <div className="mt-4 flex flex-wrap gap-3">
                                {(() => {
                                  const rank = getRankFromPoints(selectedStudent.leaderboard_points);
                                  return (
                                    <Badge className={`bg-gradient-to-r ${rank.gradient} text-white border-none`}>
                                      {rank.emoji} {rank.name}
                                    </Badge>
                                  );
                                })()}

                                <Badge variant="outline" className="capitalize">
                                  Role: {selectedStudent.role}
                                </Badge>

                                {selectedStudent.mentor_name && (
                                  <Badge variant="outline">
                                    Mentor: {selectedStudent.mentor_name}
                                  </Badge>
                                )}
                              </div>

                              <p className="text-sm text-gray-500 mt-3">
                                Joined: {new Date(selectedStudent.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Role Management */}
                      <Card className="border-2 border-amber-200 dark:border-amber-800">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <Shield className="w-5 h-5" />
                            Change User Role
                          </CardTitle>
                          <CardDescription>
                            Change this user's role in the system. Be careful when changing roles.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                              <div className="flex-1 w-full">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                  Select New Role
                                </label>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="student">
                                      <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Student
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="mentor">
                                      <div className="flex items-center gap-2">
                                        <UserCog className="w-4 h-4" />
                                        Mentor
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="coursemaster">
                                      <div className="flex items-center gap-2">
                                        <Trophy className="w-4 h-4" />
                                        Course Master
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="admin">
                                      <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        Admin
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <Button
                                onClick={handleRoleChange}
                                disabled={changingRole || selectedRole === selectedStudent.role}
                                className="h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold sm:mt-7"
                              >
                                {changingRole ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Changing...
                                  </>
                                ) : (
                                  <>
                                    <Shield className="w-4 h-4 mr-2" />
                                    Change Role
                                  </>
                                )}
                              </Button>
                            </div>

                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                              <p className="text-xs text-amber-800 dark:text-amber-200">
                                ⚠️ <strong>Current Role:</strong> {selectedStudent.role}
                                <br />
                                <strong>New Role:</strong> {selectedRole}
                              </p>
                              <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                                <strong>Role Descriptions:</strong>
                                <br />• <strong>Student:</strong> Basic access to courses and learning materials
                                <br />• <strong>Mentor:</strong> Can manage assigned students, create quizzes, and send notifications
                                <br />• <strong>Course Master:</strong> Can manage session tracker
                                <br />• <strong>Admin:</strong> Full access to all features and user management
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Stats */}
                      {studentStats && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <Card>
                            <CardContent className="p-6">
                              <div className="text-center">
                                <Trophy className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Points</p>
                                <p className="text-2xl font-bold text-purple-600">
                                  {studentStats.total_points.toLocaleString()}
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-6">
                              <div className="text-center">
                                <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 dark:text-gray-400">Quizzes</p>
                                <p className="text-2xl font-bold text-green-600">
                                  {studentStats.quizzes_completed}
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-6">
                              <div className="text-center">
                                <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy</p>
                                <p className="text-2xl font-bold text-blue-600">
                                  {studentStats.total_attempts > 0
                                    ? Math.round((studentStats.correct_answers / studentStats.total_attempts) * 100)
                                    : 0}%
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-6">
                              <div className="text-center">
                                <Users className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 dark:text-gray-400">Correct/Total</p>
                                <p className="text-2xl font-bold text-orange-600">
                                  {studentStats.correct_answers}/{studentStats.total_attempts}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Feedback */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Student Feedback
                          </CardTitle>
                          <CardDescription>
                            Feedback submitted by this student
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {studentFeedback.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                No feedback submitted yet
                              </div>
                            ) : (
                              studentFeedback.map((feedback) => (
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
                                          For Mentor: {feedback.mentor_name}
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
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
