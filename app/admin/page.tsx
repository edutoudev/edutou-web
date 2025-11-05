'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  FileText,
  Activity,
  Shield,
  Loader2,
  Check,
} from 'lucide-react'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'

interface AdminStats {
  totalUsers: number
  totalQuizzes: number
  totalCourses: number
  activeUsers: number
}

interface RecentUser {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  created_at: string
}

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalQuizzes: 0,
    totalCourses: 0,
    activeUsers: 0,
  })
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function fetchAdminData() {
      try {
        setLoading(true)

        // Fetch total users (excluding admins)
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .neq('role', 'admin')

        // Fetch recent users (excluding admins)
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, created_at')
          .neq('role', 'admin')
          .order('created_at', { ascending: false })
          .limit(10)

        setStats(prev => ({
          ...prev,
          totalUsers: userCount || 0,
          activeUsers: userCount || 0, // TODO: Implement active users logic
          totalQuizzes: 0, // TODO: Implement when quizzes table exists
          totalCourses: 0, // TODO: Implement when courses table exists
        }))

        setRecentUsers(users || [])
      } catch (error) {
        console.error('Error fetching admin data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAdminData()
  }, [])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingRoleFor(userId)

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) {
        console.error('Error updating role:', error)
        alert('Failed to update role')
        return
      }

      // Update local state
      setRecentUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      )

      // Show success feedback
      setTimeout(() => {
        setUpdatingRoleFor(null)
      }, 500)
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update role')
      setUpdatingRoleFor(null)
    }
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      icon: Activity,
      color: 'bg-green-500',
    },
    {
      title: 'Total Quizzes',
      value: stats.totalQuizzes,
      icon: FileText,
      color: 'bg-purple-500',
    },
  ]

  return (
    <main className="overflow-hidden bg-slate-50 dark:bg-black reading:bg-amber-50 min-h-screen transition-colors duration-300">
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
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400 reading:text-amber-700">
                Manage your platform and monitor performance
              </p>
            </div>
            <Badge className="bg-red-500 text-white rounded-full px-4 py-2">
              <Shield className="mr-2 h-4 w-4" />
              Admin Access
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-cyan-500 reading:text-orange-500" />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {statCards.map((stat) => (
                  <motion.div
                    key={stat.title}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="border-none shadow-lg rounded-2xl bg-white dark:bg-slate-800 reading:bg-amber-50">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 reading:text-amber-700">
                              {stat.title}
                            </p>
                            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                              {stat.value}
                            </p>
                          </div>
                          <div
                            className={cn(
                              stat.color,
                              'flex h-14 w-14 items-center justify-center rounded-2xl text-white'
                            )}
                          >
                            <stat.icon className="h-7 w-7" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* User Management */}
              <Card className="border-none shadow-lg rounded-2xl bg-white dark:bg-slate-800 reading:bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-gray-100 reading:text-amber-900">
                    User Management
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                    Manage user roles and permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentUsers.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 reading:text-amber-600 py-4">
                        No users yet
                      </p>
                    ) : (
                      recentUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 reading:bg-amber-100/50"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                                {(user.full_name || user.email || 'U')[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900 truncate">
                                {user.full_name || user.email?.split('@')[0] || 'Anonymous'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 reading:text-amber-600 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Select
                              value={user.role || 'student'}
                              onValueChange={(value) => handleRoleChange(user.id, value)}
                              disabled={updatingRoleFor === user.id}
                            >
                              <SelectTrigger className="w-[120px] rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    Student
                                  </div>
                                </SelectItem>
                                <SelectItem value="mentor">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                    Mentor
                                  </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-red-500" />
                                    Admin
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {updatingRoleFor === user.id && (
                              <Check className="h-4 w-4 text-green-500 animate-pulse" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
