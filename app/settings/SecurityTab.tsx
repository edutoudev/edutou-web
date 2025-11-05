"use client"

import { useState, useEffect } from "react"
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/utils/supabase/client"

export function SecurityTab() {
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [authProvider, setAuthProvider] = useState<string | null>(null)
    const [userEmail, setUserEmail] = useState<string>("")

    const supabase = createClient()

    // Check authentication provider
    useEffect(() => {
        const checkAuthProvider = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    setUserEmail(user.email || "")
                    // Check the provider from app_metadata or user metadata
                    const provider = user.app_metadata?.provider ||
                                   user.identities?.[0]?.provider ||
                                   'email'
                    setAuthProvider(provider)
                }
            } catch (error) {
                console.error('Error fetching user:', error)
            }
        }

        checkAuthProvider()
    }, [])

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setMessage(null)

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            setMessage({ type: 'error', text: 'All fields are required' })
            return
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' })
            return
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters long' })
            return
        }

        if (currentPassword === newPassword) {
            setMessage({ type: 'error', text: 'New password must be different from current password' })
            return
        }

        setLoading(true)

        try {
            // First, verify the current password by trying to sign in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: currentPassword,
            })

            if (signInError) {
                setMessage({ type: 'error', text: 'Current password is incorrect' })
                setLoading(false)
                return
            }

            // If verification successful, update the password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (updateError) {
                setMessage({ type: 'error', text: updateError.message })
            } else {
                setMessage({ type: 'success', text: 'Password updated successfully!' })
                // Clear form
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred' })
            console.error('Password update error:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border-gray-200 dark:border-slate-700 reading:border-amber-300 rounded-xl shadow-sm bg-white dark:bg-slate-800 reading:bg-amber-50">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl text-gray-900 dark:text-gray-100 reading:text-amber-900">Security Settings</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 reading:text-amber-700">Manage your account security and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-8">
                {/* Password Section */}
                <div className="space-y-4 sm:space-y-5">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900 text-base sm:text-lg">Password</h3>

                    {authProvider === 'google' ? (
                        // Google Auth User
                        <div className="p-5 bg-blue-50 dark:bg-blue-900/20 reading:bg-blue-100 border border-blue-200 dark:border-blue-800 reading:border-blue-300 rounded-xl">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-medium text-blue-900 dark:text-blue-200 reading:text-blue-900 mb-1">
                                        Connected with Google
                                    </h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 reading:text-blue-800">
                                        Your account is authenticated through Google. Password management is handled by your Google account.
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 reading:text-blue-700 mt-2">
                                        To change your password, please visit your Google Account settings.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Email Auth User - Show Password Form
                        <form onSubmit={handlePasswordUpdate} className="space-y-4 sm:space-y-5">
                            {message && (
                                <div className={`p-4 rounded-xl flex items-start gap-3 ${
                                    message.type === 'success'
                                        ? 'bg-green-50 dark:bg-green-900/20 reading:bg-green-100 border border-green-200 dark:border-green-800 reading:border-green-300'
                                        : 'bg-red-50 dark:bg-red-900/20 reading:bg-red-100 border border-red-200 dark:border-red-800 reading:border-red-300'
                                }`}>
                                    {message.type === 'success' ? (
                                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                    )}
                                    <p className={`text-sm ${
                                        message.type === 'success'
                                            ? 'text-green-700 dark:text-green-300 reading:text-green-800'
                                            : 'text-red-700 dark:text-red-300 reading:text-red-800'
                                    }`}>
                                        {message.text}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2 sm:space-y-3">
                                <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300 reading:text-amber-800">
                                    Current Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="currentPassword"
                                        type={showCurrentPassword ? "text" : "password"}
                                        placeholder="Enter current password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="rounded-xl pr-12 bg-white dark:bg-slate-900 reading:bg-amber-50"
                                        disabled={loading}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-lg"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        disabled={loading}
                                    >
                                        {showCurrentPassword ? (
                                            <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        ) : (
                                            <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                                <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300 reading:text-amber-800">
                                    New Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="newPassword"
                                        type={showNewPassword ? "text" : "password"}
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="rounded-xl pr-12 bg-white dark:bg-slate-900 reading:bg-amber-50"
                                        disabled={loading}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-lg"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        disabled={loading}
                                    >
                                        {showNewPassword ? (
                                            <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        ) : (
                                            <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 reading:text-amber-600">
                                    Password must be at least 6 characters long
                                </p>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300 reading:text-amber-800">
                                    Confirm New Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="rounded-xl pr-12 bg-white dark:bg-slate-900 reading:bg-amber-50"
                                        disabled={loading}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-lg"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={loading}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        ) : (
                                            <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 dark:from-blue-500 dark:to-cyan-500 dark:hover:from-blue-600 dark:hover:to-cyan-600 reading:from-amber-600 reading:to-orange-600 reading:hover:from-amber-700 reading:hover:to-orange-700 text-white rounded-xl"
                            >
                                <Lock className="w-4 h-4" />
                                {loading ? 'Updating...' : 'Update Password'}
                            </Button>
                        </form>
                    )}
                </div>

                {/* Active Sessions Section */}
                <div className="space-y-4 sm:space-y-5">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900 text-base sm:text-lg">Active Sessions</h3>
                    <div className="space-y-3 sm:space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 bg-gray-50 dark:bg-slate-700/50 reading:bg-amber-100/50 border border-gray-200 dark:border-slate-600 reading:border-amber-200 rounded-xl">
                            <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900 text-sm sm:text-base">Current Session</div>
                                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 reading:text-amber-700 mt-1">
                                    {authProvider === 'google' ? 'Authenticated via Google' : 'Email Authentication'}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 reading:text-amber-600 mt-0.5">Last active: Now</div>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 reading:bg-green-100 text-green-700 dark:text-green-400 reading:text-green-800 rounded-lg px-3 self-start sm:self-auto">
                                Current
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
