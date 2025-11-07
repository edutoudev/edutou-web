'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/platform/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Calendar, UserCheck, MessageCircle, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MentorInfo {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  bio?: string;
  assigned_at: string;
  student_count: number;
}

export default function StudentMentorPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mentor, setMentor] = useState<MentorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAssignment, setHasAssignment] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadMentorInfo();
  }, []);

  const loadMentorInfo = async () => {
    try {
      setLoading(true);

      // Get current user (student)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get mentor assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('mentor_assignments')
        .select('mentor_id, assigned_at')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      // Ignore errors if table doesn't exist or is empty
      if (assignmentError && assignmentError.code !== 'PGRST116' && assignmentError.code !== '42P01') {
        console.error('Assignment error:', assignmentError);
      }

      if (!assignment || !assignment.mentor_id) {
        setHasAssignment(false);
        setLoading(false);
        return;
      }

      // Get mentor profile
      const { data: mentorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, bio')
        .eq('id', assignment.mentor_id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!mentorProfile) {
        setHasAssignment(false);
        setLoading(false);
        return;
      }

      // Get mentor's student count
      const { data: mentorAssignments, error: countError } = await supabase
        .from('mentor_assignments')
        .select('id', { count: 'exact', head: false })
        .eq('mentor_id', assignment.mentor_id)
        .eq('status', 'active');

      // Ignore errors if table doesn't exist or is empty
      if (countError && countError.code !== 'PGRST116' && countError.code !== '42P01') {
        console.error('Count error:', countError);
      }

      setMentor({
        id: mentorProfile.id,
        full_name: mentorProfile.full_name || 'Mentor',
        email: mentorProfile.email,
        phone: mentorProfile.phone,
        bio: mentorProfile.bio,
        assigned_at: assignment.assigned_at,
        student_count: mentorAssignments?.length || 0,
      });
      setHasAssignment(true);
    } catch (error) {
      console.error('Error loading mentor info:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'M';
    const names = name.trim().split(/\s+/);
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
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
          <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          My Mentor
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Connect with your assigned mentor for guidance and support
        </p>
      </div>

      {/* Mentor Info or No Mentor Message */}
      {!hasAssignment ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Mentor Assigned Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You haven't been assigned a mentor yet. Please contact the admin or wait for assignment.
            </p>
            <Button variant="outline">
              Contact Admin
            </Button>
          </CardContent>
        </Card>
      ) : mentor && (
        <>
          {/* Mentor Profile Card */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="w-32 h-32 border-4 border-blue-100 dark:border-blue-900">
                    <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white font-bold">
                      {getInitials(mentor.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                    Your Mentor
                  </Badge>
                </div>

                {/* Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {mentor.full_name}
                    </h2>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        Assigned since {new Date(mentor.assigned_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {mentor.bio && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        About
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {mentor.bio}
                      </p>
                    </div>
                  )}

                  <div className="pt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Currently mentoring <span className="font-semibold text-blue-600">{mentor.student_count}</span> student{mentor.student_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Reach out to your mentor for help and guidance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</p>
                  <p className="text-blue-600 dark:text-blue-400 truncate block">
                    {mentor.email}
                  </p>
                </div>
              </div>

              {/* Phone (if available) */}
              {mentor.phone && (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</p>
                    <a
                      href={`tel:${mentor.phone}`}
                      className="text-green-600 dark:text-green-400 hover:underline"
                    >
                      {mentor.phone}
                    </a>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a href={`tel:${mentor.phone}`}>
                      Call
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
          </div>
        )}
      </div>
    </main>
  );
}
