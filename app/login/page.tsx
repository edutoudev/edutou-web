"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, ArrowLeft, Sun, Moon, BookOpen } from "lucide-react"
import { login, signup } from './actions'
import { useTheme } from "@/contexts/ThemeContext"
import { createClient } from "@/utils/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentView, setCurrentView] = useState<"login" | "register" | "forgot">("login")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const { theme, setTheme } = useTheme()
  const supabase = createClient()

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // User is logged in, check their role and redirect
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          const role = profile?.role?.toLowerCase() || 'student'

          // Redirect based on role
          switch (role) {
            case 'admin':
              router.push('/admin')
              break
            case 'mentor':
              router.push('/mentor')
              break
            case 'student':
            default:
              router.push('/')
              break
          }
          return
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      } finally {
        setCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router, supabase])

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('reading')
    else setTheme('light')
  }

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="h-5 w-5" />
    if (theme === 'dark') return <Moon className="h-5 w-5" />
    return <BookOpen className="h-5 w-5" />
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formElement = e.currentTarget
    const formData = new FormData(formElement)

    try {
      if (currentView === "login") {
        await login(formData)
      } else if (currentView === "register") {
        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string

        if (password !== confirmPassword) {
          setError("Passwords do not match")
          setLoading(false)
          return
        }

        await signup(formData)
      } else if (currentView === "forgot") {
        // Handle forgot password
        const email = formData.get('email') as string
        if (!email) {
          setError("Email is required")
          setLoading(false)
          return
        }
        // Add your password reset logic here
        console.log("Password reset for:", email)
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setLoading(false)
    }
  }

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex font-sans relative">
      {/* Theme Toggle Button - Top Right */}
      <button
        onClick={cycleTheme}
        className="fixed top-6 right-6 z-50 p-3 rounded-xl bg-white/90 dark:bg-slate-800/90 reading:bg-amber-100/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700 reading:border-amber-300 shadow-lg hover:shadow-xl transition-all hover:scale-110 text-gray-700 dark:text-gray-300 reading:text-amber-800"
        aria-label="Toggle theme"
      >
        {getThemeIcon()}
      </button>

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-black dark:bg-black reading:bg-amber-900">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        >
          <source src="https://www.pexels.com/download/video/2715412/" type="video/mp4" />
        </video>
        
        <div className="relative z-10 flex flex-col justify-between w-full px-12 py-12 bg-gradient-to-br from-orange-600/40 dark:from-orange-700/40 reading:from-amber-600/40 to-transparent">
          <div className="flex items-center">
            <img
              src="/logo.jpg"
              alt="Edutou Skill Academy Logo"
              className="h-12 w-auto mr-3 rounded-lg shadow-lg"
            />
            <h1 className="text-xl font-bold text-white">Edutou Skill Academy X Madras Engineering College</h1>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
              Master Skills Through <span className="text-orange-300 dark:text-orange-400 reading:text-amber-300">Interactive Quizzes</span>
            </h2>
            <p className="text-white/95 text-lg leading-relaxed max-w-md">
              Test your knowledge, track your progress, and unlock your potential with our comprehensive quiz platform.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 dark:bg-black reading:bg-amber-50 transition-colors duration-300">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
            <img
              src="/logo.jpg"
              alt="Edutou Skill Academy Logo"
              className="h-12 w-auto mx-auto mb-3 rounded-lg"
            />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 reading:text-amber-900">Edutou Skill Academy</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 text-center">
              {currentView === "forgot" && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentView("login")}
                  className="absolute left-8 top-8 p-2 rounded-xl hover:bg-orange-100 dark:hover:bg-slate-700 reading:hover:bg-amber-200 text-gray-900 dark:text-gray-100 reading:text-amber-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                {currentView === "login" && "Welcome Back"}
                {currentView === "register" && "Create Account"}
                {currentView === "forgot" && "Reset Password"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                {currentView === "login" && "Sign in to continue your learning journey."}
                {currentView === "register" && "Join thousands of learners mastering new skills."}
                {currentView === "forgot" && "Enter your email address and we'll send you a reset link."}
              </p>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 dark:text-red-400 reading:text-red-700 bg-red-50 dark:bg-red-900/20 reading:bg-red-100 border border-red-200 dark:border-red-800 reading:border-red-300 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {currentView === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    required
                    className="h-12 bg-white dark:bg-slate-800 reading:bg-amber-50 border-gray-300 dark:border-slate-600 reading:border-amber-300 text-gray-900 dark:text-gray-100 reading:text-amber-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 reading:placeholder:text-amber-600 focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 reading:focus:ring-amber-500 focus:border-orange-500 dark:focus:border-orange-600 reading:focus:border-amber-500 rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="user@company.com"
                  required
                  className="h-12 bg-white dark:bg-slate-800 reading:bg-amber-50 border-gray-300 dark:border-slate-600 reading:border-amber-300 text-gray-900 dark:text-gray-100 reading:text-amber-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 reading:placeholder:text-amber-600 focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 reading:focus:ring-amber-500 focus:border-orange-500 dark:focus:border-orange-600 reading:focus:border-amber-500 rounded-xl"
                />
              </div>

              {currentView !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      required
                      className="h-12 pr-10 bg-white dark:bg-slate-800 reading:bg-amber-50 border-gray-300 dark:border-slate-600 reading:border-amber-300 text-gray-900 dark:text-gray-100 reading:text-amber-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 reading:placeholder:text-amber-600 focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 reading:focus:ring-amber-500 focus:border-orange-500 dark:focus:border-orange-600 reading:focus:border-amber-500 rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500 dark:text-gray-400 reading:text-amber-600" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400 reading:text-amber-600" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {currentView === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      required
                      className="h-12 pr-10 bg-white dark:bg-slate-800 reading:bg-amber-50 border-gray-300 dark:border-slate-600 reading:border-amber-300 text-gray-900 dark:text-gray-100 reading:text-amber-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 reading:placeholder:text-amber-600 focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 reading:focus:ring-amber-500 focus:border-orange-500 dark:focus:border-orange-600 reading:focus:border-amber-500 rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500 dark:text-gray-400 reading:text-amber-600" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400 reading:text-amber-600" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 dark:from-orange-600 dark:to-orange-700 dark:hover:from-orange-700 dark:hover:to-orange-800 reading:from-orange-600 reading:to-orange-700 reading:hover:from-orange-700 reading:hover:to-orange-800 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {loading ? "Processing..." : (
                <>
                  {currentView === "login" && "Log In"}
                  {currentView === "register" && "Create Account"}
                  {currentView === "forgot" && "Send Reset Link"}
                </>
              )}
            </Button>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400 reading:text-amber-700">
              {currentView === "login" && (
                <>
                  Don't Have An Account?{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-600 reading:text-orange-700 reading:hover:text-orange-800"
                    onClick={() => setCurrentView("register")}
                  >
                    Register Now.
                  </Button>
                </>
              )}
              {currentView === "register" && (
                <>
                  Already Have An Account?{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-600 reading:text-orange-700 reading:hover:text-orange-800"
                    onClick={() => setCurrentView("login")}
                  >
                    Sign In.
                  </Button>
                </>
              )}
              {currentView === "forgot" && (
                <>
                  Remember Your Password?{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-600 reading:text-orange-700 reading:hover:text-orange-800"
                    onClick={() => setCurrentView("login")}
                  >
                    Back to Login.
                  </Button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

