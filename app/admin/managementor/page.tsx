'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/platform/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, UserCheck, UserX, Save, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Student {
  id: string;
  full_name: string;
  email: string;
  assigned_mentor_id?: string | null;
  mentor_name?: string | null;
}

interface Mentor {
  id: string;
  full_name: string;
  email: string;
  student_count: number;
}

export default function ManageMentorPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');

  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .order('full_name');

      if (studentsError) throw studentsError;

      // Load all mentor assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('mentor_assignments')
        .select('student_id, mentor_id')
        .eq('status', 'active');

      // Ignore errors if table doesn't exist or is empty
      // Common error codes: PGRST116 (no rows), 42P01 (table doesn't exist)
      if (assignmentsError && assignmentsError.code !== 'PGRST116' && assignmentsError.code !== '42P01') {
        console.error('Assignments error:', assignmentsError);
      }

      // Load all mentors to get their names for display
      const { data: allMentors, error: allMentorsError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'mentor');

      if (allMentorsError) throw allMentorsError;

      // Create a map of mentor IDs to names
      const mentorMap = new Map(
        (allMentors || []).map((m: any) => [m.id, m.full_name || 'No Name'])
      );

      // Create a map of student IDs to their assigned mentor
      const assignmentMap = new Map(
        (assignments || []).map((a: any) => [a.student_id, a.mentor_id])
      );

      // Transform students data with mentor info
      const transformedStudents = (studentsData || []).map((student: any) => {
        const mentorId = assignmentMap.get(student.id);
        return {
          id: student.id,
          full_name: student.full_name || 'No Name',
          email: student.email,
          assigned_mentor_id: mentorId || null,
          mentor_name: mentorId ? mentorMap.get(mentorId) : null,
        };
      });

      setStudents(transformedStudents);

      // Load all mentors with student counts
      const { data: mentorsData, error: mentorsError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'mentor')
        .order('full_name');

      if (mentorsError) throw mentorsError;

      // Count students for each mentor
      const studentCountMap = new Map<string, number>();
      (assignments || []).forEach((a: any) => {
        studentCountMap.set(a.mentor_id, (studentCountMap.get(a.mentor_id) || 0) + 1);
      });

      const transformedMentors = (mentorsData || []).map((mentor: any) => ({
        id: mentor.id,
        full_name: mentor.full_name || 'No Name',
        email: mentor.email,
        student_count: studentCountMap.get(mentor.id) || 0,
      }));

      setMentors(transformedMentors);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students and mentors',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const assignMentor = async (studentId: string, mentorId: string | null) => {
    try {
      setSaving(studentId);

      // Get current user for assigned_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (mentorId) {
        // Check if student already has a mentor assignment
        const { data: existing } = await supabase
          .from('mentor_assignments')
          .select('id')
          .eq('student_id', studentId)
          .maybeSingle();

        if (existing) {
          // Update existing assignment
          const { error: updateError } = await supabase
            .from('mentor_assignments')
            .update({
              mentor_id: mentorId,
              assigned_by: user.id,
              updated_at: new Date().toISOString(),
              status: 'active',
            })
            .eq('student_id', studentId);

          if (updateError) throw updateError;
        } else {
          // Create new assignment
          const { error: insertError } = await supabase
            .from('mentor_assignments')
            .insert({
              student_id: studentId,
              mentor_id: mentorId,
              assigned_by: user.id,
              status: 'active',
            });

          if (insertError) throw insertError;
        }

        toast({
          title: 'Success',
          description: 'Mentor assigned successfully',
        });
      } else {
        // Remove mentor assignment
        const { error: deleteError } = await supabase
          .from('mentor_assignments')
          .delete()
          .eq('student_id', studentId);

        if (deleteError) throw deleteError;

        toast({
          title: 'Success',
          description: 'Mentor assignment removed',
        });
      }

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error assigning mentor:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign mentor',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'assigned' && student.assigned_mentor_id) ||
      (filterStatus === 'unassigned' && !student.assigned_mentor_id);

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: students.length,
    assigned: students.filter(s => s.assigned_mentor_id).length,
    unassigned: students.filter(s => !s.assigned_mentor_id).length,
  };

  return (
    <main className="overflow-hidden bg-slate-50 dark:bg-black min-h-screen transition-colors duration-300">
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="container mx-auto p-6 max-w-7xl space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Manage Mentor Assignments
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Assign students to mentors and manage mentor-student relationships
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                    </div>
                    <Users className="w-10 h-10 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Assigned</p>
                      <p className="text-3xl font-bold text-green-600">{stats.assigned}</p>
                    </div>
                    <UserCheck className="w-10 h-10 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Unassigned</p>
                      <p className="text-3xl font-bold text-orange-600">{stats.unassigned}</p>
                    </div>
                    <UserX className="w-10 h-10 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search students by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Students List */}
            <Card>
              <CardHeader>
                <CardTitle>Student List ({filteredStudents.length})</CardTitle>
                <CardDescription>
                  Assign or update mentor for each student using the dropdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No students found matching your filters
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                            {student.full_name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {student.email}
                          </p>
                          {student.mentor_name && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs">
                                Currently: {student.mentor_name}
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={student.assigned_mentor_id || 'none'}
                            onValueChange={(value) => assignMentor(student.id, value === 'none' ? null : value)}
                            disabled={saving === student.id}
                          >
                            <SelectTrigger className="w-64">
                              <SelectValue placeholder="Select mentor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-gray-500">No Mentor</span>
                              </SelectItem>
                              {mentors.map((mentor) => (
                                <SelectItem key={mentor.id} value={mentor.id}>
                                  {mentor.full_name} ({mentor.student_count} students)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {saving === student.id && (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mentor Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Mentor Overview</CardTitle>
                <CardDescription>Current student distribution across mentors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mentors.map((mentor) => (
                    <div
                      key={mentor.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                            {mentor.full_name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {mentor.email}
                          </p>
                        </div>
                        <Badge className="bg-blue-600 text-white">
                          {mentor.student_count} {mentor.student_count === 1 ? 'student' : 'students'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {mentors.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      No mentors found. Please add mentors to the system first.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
