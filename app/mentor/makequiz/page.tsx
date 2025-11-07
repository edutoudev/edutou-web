'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  Save,
  Eye,
  ArrowLeft,
  Check,
  X,
  Loader2,
  Copy,
  ExternalLink,
  FileText,
  RefreshCw,
  Edit,
  Calendar,
  Play,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'

interface QuizOption {
  id: string
  text: string
}

interface QuizQuestion {
  id: string
  question: string
  options: QuizOption[]
  correctOptionId: string
}

interface Quiz {
  title: string
  description: string
  questions: QuizQuestion[]
  status: 'draft' | 'published'
}

interface SavedQuiz {
  id: string
  title: string
  description: string
  questions: QuizQuestion[]
  status: 'draft' | 'published'
  quiz_code: string | null
  created_at: string
  updated_at: string
}

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function generateQuizCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function MakeQuizPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [publishedQuizCode, setPublishedQuizCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([])
  const [loadingQuizzes, setLoadingQuizzes] = useState(true)
  const [republishingId, setRepublishingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [quiz, setQuiz] = useState<Quiz>({
    title: '',
    description: '',
    questions: [],
    status: 'draft',
  })

  const supabase = createClient()

  useEffect(() => {
    fetchSavedQuizzes()
  }, [])

  const fetchSavedQuizzes = async () => {
    try {
      setLoadingQuizzes(true)
      console.log('Fetching user...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) {
        console.error('User error:', userError)
        throw userError
      }

      if (!user) {
        console.log('No user logged in')
        return
      }

      console.log('User ID:', user.id)

      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      console.log('Query result:', { data, error })

      if (error) throw error
      setSavedQuizzes(data || [])
    } catch (error) {
      console.error('Error fetching quizzes:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
    } finally {
      setLoadingQuizzes(false)
    }
  }

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: generateId(),
      question: '',
      options: [
        { id: generateId(), text: '' },
        { id: generateId(), text: '' },
      ],
      correctOptionId: '',
    }
    setQuiz((prev) => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }))
  }

  const removeQuestion = (questionId: string) => {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== questionId),
    }))
  }

  const updateQuestion = (questionId: string, field: string, value: string) => {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, [field]: value } : q
      ),
    }))
  }

  const addOption = (questionId: string) => {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: [...q.options, { id: generateId(), text: '' }],
            }
          : q
      ),
    }))
  }

  const removeOption = (questionId: string, optionId: string) => {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.filter((o) => o.id !== optionId),
              correctOptionId: q.correctOptionId === optionId ? '' : q.correctOptionId,
            }
          : q
      ),
    }))
  }

  const updateOption = (questionId: string, optionId: string, text: string) => {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optionId ? { ...o, text } : o
              ),
            }
          : q
      ),
    }))
  }

  const setCorrectOption = (questionId: string, optionId: string) => {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, correctOptionId: optionId } : q
      ),
    }))
  }

  const validateQuiz = () => {
    if (!quiz.title.trim()) {
      alert('Please enter a quiz title')
      return false
    }
    if (quiz.questions.length === 0) {
      alert('Please add at least one question')
      return false
    }
    for (const question of quiz.questions) {
      if (!question.question.trim()) {
        alert('Please fill in all question texts')
        return false
      }
      if (question.options.length < 2) {
        alert('Each question must have at least 2 options')
        return false
      }
      for (const option of question.options) {
        if (!option.text.trim()) {
          alert('Please fill in all option texts')
          return false
        }
      }
      if (!question.correctOptionId) {
        alert('Please select a correct answer for all questions')
        return false
      }
    }
    return true
  }

  /**
   * Convert quiz data structure for database storage
   * Transforms option IDs to indices (0, 1, 2, 3) for live quiz compatibility
   */
  const convertQuizForDatabase = () => {
    return quiz.questions.map((question) => {
      // Find the index of the correct option
      const correctOptionIndex = question.options.findIndex(
        (opt) => opt.id === question.correctOptionId
      )

      return {
        id: question.id,
        question: question.question,
        options: question.options.map((opt) => opt.text), // Convert to array of strings
        correctOptionIndex: correctOptionIndex, // Use index instead of ID
      }
    })
  }

  const saveDraft = async () => {
    if (!validateQuiz()) return

    try {
      setSaving(true)
      console.log('Starting save draft...')

      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) {
        console.error('User error:', userError)
        throw userError
      }

      if (!user) {
        alert('Please log in to save quizzes')
        return
      }

      console.log('User authenticated:', user.id)

      // Convert questions to database format before saving
      const convertedQuestions = convertQuizForDatabase()
      console.log('Converted questions:', convertedQuestions)

      const { data: existingQuiz, error: checkError } = await supabase
        .from('quizzes')
        .select('id')
        .eq('title', quiz.title)
        .eq('created_by', user.id)
        .eq('status', 'draft')
        .single()

      console.log('Existing quiz check:', { existingQuiz, checkError })

      if (existingQuiz) {
        // Update existing draft
        console.log('Updating existing quiz:', existingQuiz.id)
        const { error } = await supabase
          .from('quizzes')
          .update({
            description: quiz.description,
            questions: convertedQuestions, // Use converted format
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingQuiz.id)

        if (error) {
          console.error('Update error:', error)
          throw error
        }
        console.log('Quiz updated successfully')
      } else {
        // Create new draft
        console.log('Creating new quiz')
        const { error } = await supabase
          .from('quizzes')
          .insert({
            title: quiz.title,
            description: quiz.description,
            questions: convertedQuestions, // Use converted format
            status: 'draft',
            created_by: user.id,
          })

        if (error) {
          console.error('Insert error:', error)
          throw error
        }
        console.log('Quiz created successfully')
      }

      alert('Quiz saved as draft successfully!')
      await fetchSavedQuizzes() // Refresh the list
    } catch (error) {
      console.error('Error saving draft:', error)
      console.error('Error type:', typeof error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      alert('Failed to save draft. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Publish a draft quiz (Go Live)
   * Generates a quiz code and makes the draft accessible to students
   */
  const goLiveWithDraft = async (quizId: string) => {
    try {
      setRepublishingId(quizId)

      // Generate new unique quiz code
      let quizCode = generateQuizCode()
      let isUnique = false

      while (!isUnique) {
        const { data } = await supabase
          .from('quizzes')
          .select('quiz_code')
          .eq('quiz_code', quizCode)
          .single()

        if (!data) {
          isUnique = true
        } else {
          quizCode = generateQuizCode()
        }
      }

      // Update quiz with new code and published status
      const { error } = await supabase
        .from('quizzes')
        .update({
          status: 'published',
          quiz_code: quizCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quizId)

      if (error) throw error

      setPublishedQuizCode(quizCode)
      setShowSuccessDialog(true)
      await fetchSavedQuizzes() // Refresh the list
    } catch (error) {
      console.error('Error publishing draft:', error)
      alert('Failed to publish quiz. Please try again.')
    } finally {
      setRepublishingId(null)
    }
  }

  const republishQuiz = async (quizId: string) => {
    try {
      setRepublishingId(quizId)

      // Generate new unique quiz code
      let quizCode = generateQuizCode()
      let isUnique = false

      while (!isUnique) {
        const { data } = await supabase
          .from('quizzes')
          .select('quiz_code')
          .eq('quiz_code', quizCode)
          .single()

        if (!data) {
          isUnique = true
        } else {
          quizCode = generateQuizCode()
        }
      }

      // Update quiz with new code and published status
      const { error } = await supabase
        .from('quizzes')
        .update({
          status: 'published',
          quiz_code: quizCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quizId)

      if (error) throw error

      setPublishedQuizCode(quizCode)
      setShowSuccessDialog(true)
      await fetchSavedQuizzes() // Refresh the list
    } catch (error) {
      console.error('Error republishing quiz:', error)
      alert('Failed to republish quiz. Please try again.')
    } finally {
      setRepublishingId(null)
    }
  }

  /**
   * Convert database format back to UI format for editing
   * Transforms option indices and strings back to IDs and objects
   */
  const convertQuizForEditing = (dbQuestions: any[]) => {
    return dbQuestions.map((question) => {
      // Generate IDs for options
      const options = (Array.isArray(question.options) ? question.options : []).map((optText: string, idx: number) => ({
        id: generateId(),
        text: typeof optText === 'string' ? optText : String(optText || ''),
      }))

      // Find correct option ID from index
      const correctOptionId = options[question.correctOptionIndex]?.id || ''

      return {
        id: question.id || generateId(),
        question: question.question || '',
        options: options,
        correctOptionId: correctOptionId,
      }
    })
  }

  const loadQuizForEditing = (savedQuiz: SavedQuiz) => {
    // Convert database format to UI format
    const convertedQuestions = convertQuizForEditing(savedQuiz.questions || [])

    setQuiz({
      title: savedQuiz.title,
      description: savedQuiz.description,
      questions: convertedQuestions,
      status: savedQuiz.status,
    })
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteQuiz = async (quizId: string, quizTitle: string) => {
    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete "${quizTitle}"? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      setDeletingId(quizId)

      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId)

      if (error) throw error

      await fetchSavedQuizzes() // Refresh the list
      alert('Quiz deleted successfully!')
    } catch (error) {
      console.error('Error deleting quiz:', error)
      alert('Failed to delete quiz. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const copyToClipboard = async () => {
    const quizUrl = `http://localhost:3000/quiz/${publishedQuizCode}`
    try {
      await navigator.clipboard.writeText(quizUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCloseDialog = () => {
    setShowSuccessDialog(false)
    router.push(`/quiz/${publishedQuizCode}`)
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

        <div className="space-y-6 px-4 py-8 md:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.back()}
                className="rounded-xl"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                  Create Quiz
                </h1>
                <p className="mt-1 text-gray-600 dark:text-gray-400 reading:text-amber-700">
                  Design and publish quizzes for your students
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={saving}
              className="rounded-xl"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Draft
            </Button>
          </div>

          {/* Quiz Info */}
          <Card className="border-none shadow-lg rounded-2xl bg-white dark:bg-slate-800 reading:bg-amber-50">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100 reading:text-amber-900">
                Quiz Information
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 reading:text-amber-700">
                Basic details about your quiz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  placeholder="Enter quiz title..."
                  value={quiz.title}
                  onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter quiz description..."
                  value={quiz.description}
                  onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
                  className="rounded-xl min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 reading:text-amber-900">
                Questions ({quiz.questions.length})
              </h2>
              <Button onClick={addQuestion} className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </div>

            <AnimatePresence>
              {quiz.questions.map((question, qIndex) => (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-none shadow-lg rounded-2xl bg-white dark:bg-slate-800 reading:bg-amber-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-full">
                            Q{qIndex + 1}
                          </Badge>
                          <CardTitle className="text-lg text-slate-900 dark:text-slate-100">
                            Question {qIndex + 1}
                          </CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeQuestion(question.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Question Text</Label>
                        <Textarea
                          placeholder="Enter your question..."
                          value={question.question}
                          onChange={(e) =>
                            updateQuestion(question.id, 'question', e.target.value)
                          }
                          className="rounded-xl"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Answer Options</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(question.id)}
                            disabled={question.options.length >= 6}
                            className="rounded-xl"
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Add Option
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {question.options.map((option, oIndex) => (
                            <div
                              key={option.id}
                              className={cn(
                                'flex items-center gap-2 p-3 rounded-xl border-2 transition-all',
                                question.correctOptionId === option.id
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 reading:bg-green-100'
                                  : 'border-gray-200 dark:border-slate-700 reading:border-amber-300'
                              )}
                            >
                              <button
                                onClick={() => setCorrectOption(question.id, option.id)}
                                className={cn(
                                  'flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all',
                                  question.correctOptionId === option.id
                                    ? 'border-green-500 bg-green-500'
                                    : 'border-gray-300 dark:border-slate-600'
                                )}
                              >
                                {question.correctOptionId === option.id && (
                                  <Check className="h-4 w-4 text-white" />
                                )}
                              </button>
                              <span className="flex-shrink-0 font-medium text-gray-700 dark:text-gray-300 reading:text-amber-800">
                                {String.fromCharCode(65 + oIndex)}.
                              </span>
                              <Input
                                placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                                value={option.text}
                                onChange={(e) =>
                                  updateOption(question.id, option.id, e.target.value)
                                }
                                className="flex-1 border-none bg-transparent focus-visible:ring-0"
                              />
                              {question.options.length > 2 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeOption(question.id, option.id)}
                                  className="flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 reading:text-amber-600">
                          Click the circle to mark the correct answer
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {quiz.questions.length === 0 && (
              <Card className="border-2 border-dashed border-gray-300 dark:border-slate-700 reading:border-amber-300 rounded-2xl bg-gray-50 dark:bg-slate-800/50 reading:bg-amber-100/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-gray-200 dark:bg-slate-700 reading:bg-amber-200 p-4 mb-4">
                    <Plus className="h-8 w-8 text-gray-400 dark:text-gray-500 reading:text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900 mb-2">
                    No questions yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700 mb-4 text-center">
                    Start building your quiz by adding questions
                  </p>
                  <Button onClick={addQuestion} className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Question
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Saved Quizzes */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 reading:text-amber-900">
              Your Quizzes ({savedQuizzes.length})
            </h2>

            {loadingQuizzes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-cyan-500 reading:text-orange-500" />
              </div>
            ) : savedQuizzes.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-300 dark:border-slate-700 reading:border-amber-300 rounded-2xl bg-gray-50 dark:bg-slate-800/50 reading:bg-amber-100/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 reading:text-amber-600 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 reading:text-amber-700 text-center">
                    No saved quizzes yet. Create your first quiz above!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedQuizzes.map((savedQuiz) => (
                  <motion.div
                    key={savedQuiz.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="border-none shadow-lg rounded-2xl bg-white dark:bg-slate-800 reading:bg-amber-50 hover:shadow-xl transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg text-gray-900 dark:text-gray-100 reading:text-amber-900 truncate">
                              {savedQuiz.title}
                            </CardTitle>
                            {savedQuiz.description && (
                              <CardDescription className="text-sm mt-1 line-clamp-2">
                                {savedQuiz.description}
                              </CardDescription>
                            )}
                          </div>
                          <Badge
                            className={cn(
                              'rounded-full flex-shrink-0',
                              savedQuiz.status === 'published'
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-slate-500 hover:bg-slate-600 text-white'
                            )}
                          >
                            {savedQuiz.status === 'published' ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Quiz Info */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 reading:text-amber-700">
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {savedQuiz.questions.length} questions
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(savedQuiz.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Quiz Code (if published) */}
                        {savedQuiz.status === 'published' && savedQuiz.quiz_code && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-700 dark:text-slate-300">
                                Quiz Code:
                              </span>
                              <Badge className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-full font-mono">
                                {savedQuiz.quiz_code}
                              </Badge>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-2">
                          {savedQuiz.status === 'draft' ? (
                            // Draft Actions: Edit, Delete, Go Live, Start Live Session
                            <>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => loadQuizForEditing(savedQuiz)}
                                  className="flex-1 rounded-xl border-slate-300 dark:border-slate-600"
                                >
                                  <Edit className="mr-2 h-3 w-3" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteQuiz(savedQuiz.id, savedQuiz.title)}
                                  disabled={deletingId === savedQuiz.id}
                                  className="flex-1 rounded-xl"
                                >
                                  {deletingId === savedQuiz.id ? (
                                    <>
                                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="mr-2 h-3 w-3" />
                                      Delete
                                    </>
                                  )}
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => goLiveWithDraft(savedQuiz.id)}
                                disabled={republishingId === savedQuiz.id}
                                className="w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                              >
                                {republishingId === savedQuiz.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    Publishing...
                                  </>
                                ) : (
                                  <>
                                    <Play className="mr-2 h-3 w-3" />
                                    Go Live
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => router.push(`/mentor/quiz/${savedQuiz.id}/start-live`)}
                                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                              >
                                <Play className="mr-2 h-3 w-3" />
                                Start Live Session
                              </Button>
                            </>
                          ) : (
                            // Published Actions: Edit, Republish, Start Live Session
                            <>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => loadQuizForEditing(savedQuiz)}
                                  className="flex-1 rounded-xl border-slate-300 dark:border-slate-600"
                                >
                                  <Edit className="mr-2 h-3 w-3" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => republishQuiz(savedQuiz.id)}
                                  disabled={republishingId === savedQuiz.id}
                                  className="flex-1 rounded-xl bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white"
                                >
                                  {republishingId === savedQuiz.id ? (
                                    <>
                                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                      Republishing...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="mr-2 h-3 w-3" />
                                      Republish
                                    </>
                                  )}
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => router.push(`/mentor/quiz/${savedQuiz.id}/start-live`)}
                                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                              >
                                <Play className="mr-2 h-3 w-3" />
                                Start Live Session
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              🎉 Quiz Published Successfully!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your quiz is now live and ready to be shared with students
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Quiz Code Display */}
            <div className="flex flex-col items-center gap-2">
              <Label className="text-sm text-muted-foreground">Quiz Code</Label>
              <div className="flex items-center gap-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 reading:bg-blue-100 w-full justify-center">
                <Badge className="text-2xl font-bold bg-blue-600 hover:bg-blue-700 px-6 py-2">
                  {publishedQuizCode}
                </Badge>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-2">
              <Label className="text-sm text-muted-foreground">Scan QR Code</Label>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700">
                <QRCodeSVG
                  value={`http://localhost:3000/quiz/${publishedQuizCode}`}
                  size={200}
                  level="H"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Students can scan this to access the quiz
              </p>
            </div>

            {/* URL Display */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-muted-foreground">Quiz URL</Label>
              <div className="flex gap-2">
                <Input
                  value={`http://localhost:3000/quiz/${publishedQuizCode}`}
                  readOnly
                  className="rounded-xl font-mono text-xs"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="rounded-xl flex-shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  ✓ Copied to clipboard!
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCloseDialog}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Quiz
              </Button>
              <Button
                onClick={() => setShowSuccessDialog(false)}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
