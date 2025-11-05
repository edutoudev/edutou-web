import { useState, useEffect } from "react"
import { Save, Loader2, Trophy, Zap, Target, CheckCircle, TrendingUp, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { getRankStats } from "@/lib/ranks"

interface ProfileData {
  id: string
  full_name: string
  email: string
  phone: string
  bio: string
  leaderboard_points: number
  created_at: string
  updated_at: string
}

interface LeaderboardStats {
  total_points: number
  quiz_points: number
  assignment_points: number
  bonus_points: number
  quizzes_completed: number
  correct_answers: number
  total_attempts: number
  rank: number
}

export function ProfileTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [leaderboardStats, setLeaderboardStats] = useState<LeaderboardStats | null>(null)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadProfile()
    loadLeaderboardStats()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        toast({
          title: "Error",
          description: "You must be logged in to view your profile",
          variant: "destructive",
        })
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (!data) {
        // Create initial profile
        const newProfile: ProfileData = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          phone: '',
          bio: '',
          leaderboard_points: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile)
        
        if (insertError) throw insertError
        
        setProfile(newProfile)
        setFullName(newProfile.full_name)
      } else {
        setProfile(data)
        setFullName(data.full_name || '')
        setPhone(data.phone || '')
        setBio(data.bio || '')
      }

      // Get avatar from user metadata (social login)
      if (user.user_metadata?.avatar_url) {
        setAvatarUrl(user.user_metadata.avatar_url)
      } else if (user.user_metadata?.picture) {
        setAvatarUrl(user.user_metadata.picture)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadLeaderboardStats = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) return

      // Fetch from leaderboard view/table
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading leaderboard stats:', error)
        return
      }

      if (data) {
        // Get user's rank
        const { data: allUsers } = await supabase
          .from('leaderboard')
          .select('user_id, total_points')
          .order('total_points', { ascending: false })

        const rank = allUsers?.findIndex(u => u.user_id === user.id) + 1 || 0

        setLeaderboardStats({
          total_points: data.total_points || 0,
          quiz_points: data.quiz_points || 0,
          assignment_points: data.assignment_points || 0,
          bonus_points: data.bonus_points || 0,
          quizzes_completed: data.quizzes_completed || 0,
          correct_answers: data.correct_answers || 0,
          total_attempts: data.total_attempts || 0,
          rank: rank,
        })
      }
    } catch (error) {
      console.error('Error loading leaderboard stats:', error)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    try {
      setSaving(true)

      const updates = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)

      if (error) throw error

      setProfile({ ...profile, ...updates })
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: "Error",
        description: "Failed to save profile changes",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getInitials = () => {
    if (!fullName) {
      return profile?.email ? profile.email.slice(0, 2).toUpperCase() : "AN"
    }
    
    const names = fullName.trim().split(/\s+/)
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
    }
    return fullName.slice(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <Card className="border-gray-200 dark:border-slate-700 reading:border-amber-300 rounded-xl shadow-sm bg-white dark:bg-slate-800 reading:bg-amber-50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500 reading:text-amber-600" />
        </CardContent>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card className="border-gray-200 dark:border-slate-700 reading:border-amber-300 rounded-xl shadow-sm bg-white dark:bg-slate-800 reading:bg-amber-50">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-gray-500 dark:text-gray-400 reading:text-amber-700">Unable to load profile</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Rank & Progress - First Section */}
      {leaderboardStats && (() => {
        const rankStats = getRankStats(leaderboardStats.total_points || 0);
        return (
          <Card className={`border-2 bg-gradient-to-br ${rankStats.current.gradient} bg-opacity-10 dark:bg-opacity-5 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
            <CardContent className="p-5 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{rankStats.current.emoji}</span>
                  <div>
                    <p className={`text-xl font-bold ${rankStats.current.color}`}>
                      {rankStats.current.name}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {rankStats.current.description}
                    </p>
                  </div>
                </div>
                <Badge className={`bg-gradient-to-r ${rankStats.current.gradient} text-white border-none px-3 py-1 text-xs`}>
                  {leaderboardStats.total_points.toLocaleString()} pts
                </Badge>
              </div>

              {/* Progress to Next Rank */}
              {!rankStats.isMaxRank && rankStats.next && (
                <div className="space-y-2 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      To {rankStats.next.emoji} {rankStats.next.name}
                    </span>
                    <span className={`font-bold ${rankStats.current.color}`}>
                      {rankStats.pointsNeeded.toLocaleString()} more
                    </span>
                  </div>
                  <Progress value={rankStats.progress} className="h-2" />
                </div>
              )}

              {rankStats.isMaxRank && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 text-center">
                  <p className="text-sm font-bold text-yellow-800 dark:text-yellow-400">
                    👑 Maximum Rank Achieved!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Profile Card - Compact Design */}
      <Card className="border-gray-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Profile Information</CardTitle>
          <CardDescription className="text-sm">Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar & Basic Info - Horizontal Layout */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <Avatar className="w-16 h-16 border-2 border-white dark:border-slate-700 shadow-md">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
              <AvatarFallback className="text-lg bg-gradient-to-br from-blue-600 to-cyan-600 dark:from-blue-500 dark:to-cyan-500 text-white font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                {fullName || 'Your Name'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile.email}</p>
              {avatarUrl && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">✓ Social login avatar</p>
              )}
            </div>
          </div>

          {/* Form Fields - Compact Two Column */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              className="h-9 text-sm"
              disabled
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Email cannot be changed</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white gap-2 h-9 px-5"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quiz Statistics - Compact */}
      {leaderboardStats && (
        <Card className="border-gray-200 dark:border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Performance Statistics</CardTitle>
            <CardDescription className="text-sm">Your learning progress and achievements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Leaderboard Rank */}
              <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-600 dark:text-purple-400">Leaderboard</p>
                    <p className="text-xl font-bold text-purple-900 dark:text-white">
                      #{leaderboardStats.rank || '-'}
                    </p>
                  </div>
                  <Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>

              {/* Quizzes Completed */}
              <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 dark:text-green-400">Completed</p>
                    <p className="text-xl font-bold text-green-900 dark:text-white">
                      {leaderboardStats.quizzes_completed || 0}
                    </p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>

              {/* Accuracy */}
              <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Accuracy</p>
                    <p className="text-xl font-bold text-amber-900 dark:text-white">
                      {leaderboardStats && leaderboardStats.total_attempts > 0
                        ? Math.round((leaderboardStats.correct_answers / leaderboardStats.total_attempts) * 100)
                        : 0}%
                    </p>
                  </div>
                  <Target className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>

              {/* Correct Answers */}
              <div className="p-3 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-teal-600 dark:text-teal-400">Correct</p>
                    <p className="text-xl font-bold text-teal-900 dark:text-white">
                      {leaderboardStats.correct_answers || 0}/{leaderboardStats.total_attempts || 0}
                    </p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
              </div>

              {/* Quiz Points */}
              <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Quiz Points</p>
                    <p className="text-xl font-bold text-blue-900 dark:text-white">
                      {leaderboardStats.quiz_points.toLocaleString() || 0}
                    </p>
                  </div>
                  <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              {/* Total Points */}
              <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-750 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Total Points</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                      {leaderboardStats.total_points.toLocaleString() || 0}
                    </p>
                  </div>
                  <Trophy className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}