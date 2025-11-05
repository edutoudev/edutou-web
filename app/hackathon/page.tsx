'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  LogIn,
  Copy,
  Check,
  Crown,
  Trophy,
  Target,
  Loader2,
  X,
} from 'lucide-react'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/components/ui/use-toast'

interface TeamMember {
  id: string
  user_id: string
  joined_at: string
  full_name: string | null
  email: string | null
}

interface Team {
  id: string
  team_name: string
  team_code: string
  leader_id: string
  theme: string | null
  max_members: number
  created_at: string
  member_count: number
  members: TeamMember[]
}

export default function HackathonPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchMyTeam()
  }, [])

  const fetchMyTeam = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setCurrentUserId(user.id)

      // Check if user is in a team
      const { data: membership } = await supabase
        .from('hackathon_team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        setLoading(false)
        return
      }

      // Fetch team details
      const { data: teamData, error: teamError } = await supabase
        .from('hackathon_teams')
        .select('*')
        .eq('id', membership.team_id)
        .single()

      if (teamError) {
        console.error('Error fetching team:', teamError)
        setLoading(false)
        return
      }

      // Fetch team members
      const { data: membersData } = await supabase
        .from('hackathon_team_members')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('team_id', membership.team_id)
        .order('joined_at', { ascending: true })

      const members: TeamMember[] = (membersData || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        joined_at: m.joined_at,
        full_name: m.profiles?.full_name || null,
        email: m.profiles?.email || null,
      }))

      setMyTeam({
        ...teamData,
        member_count: members.length,
        members,
      })
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateTeamCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast({
        title: "Team name required",
        description: "Please enter a team name",
        variant: "destructive",
      })
      return
    }

    if (!currentUserId) {
      toast({
        title: "Authentication required",
        description: "Please log in to create a team",
        variant: "destructive",
      })
      return
    }

    try {
      setCreating(true)

      // Check if user is already in a team
      const { data: existingMembership } = await supabase
        .from('hackathon_team_members')
        .select('id')
        .eq('user_id', currentUserId)
        .single()

      if (existingMembership) {
        toast({
          title: "Already in a team",
          description: "You are already a member of another team",
          variant: "destructive",
        })
        return
      }

      // Generate unique code
      let teamCode = generateTeamCode()
      let isUnique = false
      while (!isUnique) {
        const { data } = await supabase
          .from('hackathon_teams')
          .select('id')
          .eq('team_code', teamCode)
          .single()

        if (!data) {
          isUnique = true
        } else {
          teamCode = generateTeamCode()
        }
      }

      // Create team
      const { data: newTeam, error: teamError } = await supabase
        .from('hackathon_teams')
        .insert({
          team_name: teamName.trim(),
          team_code: teamCode,
          leader_id: currentUserId,
        })
        .select()
        .single()

      if (teamError) {
        console.error('Error creating team:', teamError)
        toast({
          title: "Failed to create team",
          description: "An error occurred while creating your team. Please try again.",
          variant: "destructive",
        })
        return
      }

      // Add leader as member
      const { error: memberError } = await supabase
        .from('hackathon_team_members')
        .insert({
          team_id: newTeam.id,
          user_id: currentUserId,
        })

      if (memberError) {
        console.error('Error adding member:', memberError)
        // Clean up team if member insertion fails
        await supabase.from('hackathon_teams').delete().eq('id', newTeam.id)
        toast({
          title: "Failed to create team",
          description: "An error occurred while creating your team. Please try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Team created!",
        description: `${teamName} has been created successfully. Share your code with teammates!`,
      })
      setTeamName('')
      setShowCreateModal(false)
      fetchMyTeam()
    } catch (err) {
      console.error('Error:', err)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Team code required",
        description: "Please enter a 6-character team code",
        variant: "destructive",
      })
      return
    }

    if (!currentUserId) {
      toast({
        title: "Authentication required",
        description: "Please log in to join a team",
        variant: "destructive",
      })
      return
    }

    try {
      setJoining(true)

      // Check if user is already in a team
      const { data: existingMembership } = await supabase
        .from('hackathon_team_members')
        .select('id')
        .eq('user_id', currentUserId)
        .single()

      if (existingMembership) {
        toast({
          title: "Already in a team",
          description: "You are already a member of another team",
          variant: "destructive",
        })
        return
      }

      // Find team by code
      const { data: team, error: teamError } = await supabase
        .from('hackathon_teams')
        .select('*')
        .eq('team_code', joinCode.toUpperCase())
        .single()

      if (teamError || !team) {
        toast({
          title: "Invalid team code",
          description: "No team found with this code. Please check and try again.",
          variant: "destructive",
        })
        return
      }

      // Check team size
      const { count } = await supabase
        .from('hackathon_team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id)

      if (count && count >= team.max_members) {
        toast({
          title: "Team is full",
          description: `This team has reached the maximum of ${team.max_members} members`,
          variant: "destructive",
        })
        return
      }

      // Join team
      const { error: memberError } = await supabase
        .from('hackathon_team_members')
        .insert({
          team_id: team.id,
          user_id: currentUserId,
        })

      if (memberError) {
        console.error('Error joining team:', memberError)
        toast({
          title: "Failed to join team",
          description: "An error occurred while joining the team. Please try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Joined team!",
        description: `You've successfully joined ${team.team_name}`,
      })
      setJoinCode('')
      setShowJoinModal(false)
      fetchMyTeam()
    } catch (err) {
      console.error('Error:', err)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setJoining(false)
    }
  }

  const handleLeaveTeam = async () => {
    if (!myTeam || !currentUserId) return

    const isLeader = myTeam.leader_id === currentUserId

    const confirmMessage = isLeader
      ? 'As the team leader, leaving will delete the entire team. Are you sure?'
      : 'Are you sure you want to leave this team?'

    if (!window.confirm(confirmMessage)) return

    try {
      if (isLeader) {
        // Delete entire team
        await supabase.from('hackathon_teams').delete().eq('id', myTeam.id)
      } else {
        // Remove member
        await supabase
          .from('hackathon_team_members')
          .delete()
          .eq('team_id', myTeam.id)
          .eq('user_id', currentUserId)
      }

      toast({
        title: "Left team",
        description: isLeader ? "Your team has been deleted" : "You've left the team successfully",
      })
      setMyTeam(null)
    } catch (err) {
      console.error('Error:', err)
      toast({
        title: "Error",
        description: "An error occurred while leaving the team",
        variant: "destructive",
      })
    }
  }

  const copyTeamCode = () => {
    if (myTeam) {
      navigator.clipboard.writeText(myTeam.team_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      const parts = name.split(' ')
      return parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase()
    }
    if (email) return email.slice(0, 2).toUpperCase()
    return 'U'
  }

  const getDisplayName = (name: string | null, email: string | null) => {
    return name || email?.split('@')[0] || 'Anonymous'
  }

  return (
    <main className="overflow-hidden bg-slate-50 dark:bg-black reading:bg-amber-50 min-h-screen transition-colors duration-300">
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

        <div className="space-y-8 px-4 py-8 md:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Hackathon
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400 reading:text-amber-700">
                Build amazing projects with your team
              </p>
            </div>
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full px-4 py-2 text-sm">
              <Trophy className="mr-2 h-4 w-4" />
              Team Hackathon
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-cyan-500 reading:text-orange-500" />
            </div>
          ) : myTeam ? (
            /* Team View */
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Team Info Card */}
              <Card className="border-none shadow-lg rounded-3xl bg-white dark:bg-slate-800 reading:bg-amber-50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-3xl text-gray-900 dark:text-gray-100 reading:text-amber-900">
                        {myTeam.team_name}
                      </CardTitle>
                      <CardDescription className="mt-2 text-lg">
                        Team Code: <span className="font-mono font-bold text-primary">{myTeam.team_code}</span>
                      </CardDescription>
                    </div>
                    <Button
                      onClick={copyTeamCode}
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Code
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Theme */}
                  {myTeam.theme && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-900/20 dark:to-pink-900/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                          Hackathon Theme
                        </h3>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 reading:text-amber-800">
                        {myTeam.theme}
                      </p>
                    </div>
                  )}

                  {/* Team Members */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                        Team Members ({myTeam.member_count}/{myTeam.max_members})
                      </h3>
                      {myTeam.member_count < myTeam.max_members && (
                        <Badge variant="outline" className="rounded-full">
                          {myTeam.max_members - myTeam.member_count} spots left
                        </Badge>
                      )}
                    </div>

                    <div className="grid gap-3">
                      {myTeam.members.map((member, index) => {
                        const isLeader = member.user_id === myTeam.leader_id
                        const isCurrentUser = member.user_id === currentUserId

                        return (
                          <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className={cn(
                              "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                              isCurrentUser
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 reading:bg-blue-100"
                                : "border-gray-200 dark:border-slate-700 reading:border-amber-300"
                            )}>
                              <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-700">
                                <AvatarFallback className={cn(
                                  "font-bold text-white text-lg",
                                  isLeader
                                    ? "bg-gradient-to-br from-amber-500 to-orange-500"
                                    : "bg-gradient-to-br from-purple-500 to-pink-500"
                                )}>
                                  {getInitials(member.full_name, member.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                                    {getDisplayName(member.full_name, member.email)}
                                  </p>
                                  {isLeader && (
                                    <Badge className="bg-amber-500 text-white rounded-full">
                                      <Crown className="h-3 w-3 mr-1" />
                                      Leader
                                    </Badge>
                                  )}
                                  {isCurrentUser && (
                                    <Badge variant="outline" className="rounded-full">
                                      You
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Joined {new Date(member.joined_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Leave Team */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleLeaveTeam}
                      variant="destructive"
                      className="rounded-xl"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Leave Team
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* No Team View */
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create Team */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Card
                    onClick={() => setShowCreateModal(true)}
                    className="cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 reading:hover:bg-purple-100 h-full"
                  >
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                        <Plus className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100 reading:text-amber-900">
                        Create Team
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Start your own team and invite others to join
                      </p>
                      <Badge className="bg-purple-500 text-white rounded-full">
                        Become Leader
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Join Team */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Card
                    onClick={() => setShowJoinModal(true)}
                    className="cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/10 reading:hover:bg-pink-100 h-full"
                  >
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-red-500">
                        <LogIn className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100 reading:text-amber-900">
                        Join Team
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Enter a team code to join an existing team
                      </p>
                      <Badge className="bg-pink-500 text-white rounded-full">
                        Join as Member
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          )}

          {/* Create Team Modal */}
          <AnimatePresence>
            {showCreateModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={() => setShowCreateModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded-3xl bg-background p-6"
                >
                  <h2 className="text-2xl font-semibold mb-4">Create Your Team</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Team Name</label>
                      <Input
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Enter team name (cannot be changed later)"
                        className="rounded-2xl"
                        maxLength={50}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Note: Team name cannot be changed after creation
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowCreateModal(false)}
                        variant="outline"
                        className="flex-1 rounded-2xl"
                        disabled={creating}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateTeam}
                        className="flex-1 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600"
                        disabled={creating}
                      >
                        {creating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Team'
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Join Team Modal */}
          <AnimatePresence>
            {showJoinModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={() => setShowJoinModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded-3xl bg-background p-6"
                >
                  <h2 className="text-2xl font-semibold mb-4">Join a Team</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Team Code</label>
                      <Input
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="Enter 6-character team code"
                        className="rounded-2xl font-mono text-lg tracking-wider"
                        maxLength={6}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowJoinModal(false)}
                        variant="outline"
                        className="flex-1 rounded-2xl"
                        disabled={joining}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleJoinTeam}
                        className="flex-1 rounded-2xl bg-gradient-to-r from-pink-600 to-red-600"
                        disabled={joining}
                      >
                        {joining ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          'Join Team'
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
