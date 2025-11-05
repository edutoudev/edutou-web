'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import {
  Award,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PointConfig {
  id: string
  action_type: string
  points: number
  description: string | null
  is_active: boolean
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  'task_submission': 'Task Submission',
  'discussion_create': 'Create Discussion',
  'discussion_comment': 'Comment on Discussion',
  'quiz_completion': 'Quiz Completion',
  'quiz_perfect_score': 'Quiz Perfect Score',
  'resource_upload': 'Resource Upload',
  'hackathon_participation': 'Hackathon Participation',
  'feedback_submission': 'Feedback Submission',
  'daily_login': 'Daily Login',
  'profile_completion': 'Profile Completion',
}

export default function AdminManagePoints() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pointConfigs, setPointConfigs] = useState<PointConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAccess()
    fetchPointConfigs()
  }, [])

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      router.push('/')
    }
  }

  const fetchPointConfigs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('points_config')
        .select('*')
        .order('action_type')

      if (error) {
        console.error('Error fetching point configs:', error)
        setPointConfigs([])
      } else {
        setPointConfigs(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      setPointConfigs([])
    } finally {
      setLoading(false)
    }
  }

  const handlePointsChange = (id: string, newPoints: number) => {
    setPointConfigs(prev =>
      prev.map(config =>
        config.id === id ? { ...config, points: newPoints } : config
      )
    )
  }

  const handleActiveToggle = async (id: string, isActive: boolean) => {
    try {
      setSaving(id)
      const { error } = await supabase
        .from('points_config')
        .update({ is_active: isActive })
        .eq('id', id)

      if (error) {
        console.error('Error updating config:', error)
        alert('Failed to update configuration')
        return
      }

      setPointConfigs(prev =>
        prev.map(config =>
          config.id === id ? { ...config, is_active: isActive } : config
        )
      )

      showSuccess(`${isActive ? 'Enabled' : 'Disabled'} successfully`)
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred')
    } finally {
      setSaving(null)
    }
  }

  const handleSavePoints = async (config: PointConfig) => {
    if (config.points < 0) {
      alert('Points cannot be negative')
      return
    }

    if (config.points > 10000) {
      alert('Points cannot exceed 10,000')
      return
    }

    try {
      setSaving(config.id)
      const { error } = await supabase
        .from('points_config')
        .update({ points: config.points })
        .eq('id', config.id)

      if (error) {
        console.error('Error updating points:', error)
        alert('Failed to update points')
        return
      }

      showSuccess('Points updated successfully')
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred')
    } finally {
      setSaving(null)
    }
  }

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const getTotalActivePoints = () => {
    return pointConfigs
      .filter(c => c.is_active)
      .reduce((sum, c) => sum + c.points, 0)
  }

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
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 reading:text-amber-900">
              Manage Points System
            </h1>
            <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700 mt-1">
              Configure point values for student actions
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="p-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{successMessage}</span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-lg rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 reading:text-amber-700">
                  Total Action Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                  {pointConfigs.length}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 reading:text-amber-700">
                  Active Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {pointConfigs.filter(c => c.is_active).length}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 reading:text-amber-700">
                  Total Active Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {getTotalActivePoints()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Point Configurations */}
          <Card className="border-none shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100 reading:text-amber-900 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Point Configurations
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                Adjust point values and enable/disable actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : pointConfigs.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                    No point configurations found
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 reading:text-amber-600 mt-1">
                    Run the points_system_schema.sql to set up the points system
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pointConfigs.map((config) => (
                    <div
                      key={config.id}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all",
                        config.is_active
                          ? "border-gray-200 dark:border-slate-700 reading:border-amber-300 bg-white dark:bg-slate-800 reading:bg-amber-50"
                          : "border-gray-100 dark:border-slate-800 reading:border-amber-200 bg-gray-50 dark:bg-slate-900 reading:bg-amber-100/50 opacity-60"
                      )}
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Action Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                              {ACTION_TYPE_LABELS[config.action_type] || config.action_type}
                            </h3>
                            {config.is_active ? (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 reading:bg-green-200">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 reading:text-amber-700">
                            {config.description || 'No description'}
                          </p>
                        </div>

                        {/* Points Input */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={config.points}
                              onChange={(e) => handlePointsChange(config.id, parseInt(e.target.value) || 0)}
                              className="w-24 rounded-xl"
                              min="0"
                              max="10000"
                              disabled={!config.is_active}
                            />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">pts</span>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleSavePoints(config)}
                            disabled={saving === config.id || !config.is_active}
                            className="rounded-xl"
                          >
                            {saving === config.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </>
                            )}
                          </Button>

                          {/* Enable/Disable Toggle */}
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={config.is_active}
                              onCheckedChange={(checked) => handleActiveToggle(config.id, checked)}
                              disabled={saving === config.id}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-none shadow-lg rounded-2xl bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    How the Points System Works
                  </h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>Points are automatically awarded when students complete actions</li>
                    <li>Disabled actions will not award any points</li>
                    <li>Point values can be adjusted at any time</li>
                    <li>All point awards are tracked in the points history</li>
                    <li>Points are added to the student's leaderboard score</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
