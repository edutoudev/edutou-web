"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { uploadTaskFile } from "@/utils/storage"
import { awardPoints } from "@/utils/points"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/platform/Header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Upload,
  Link as LinkIcon,
  FileText,
  Image as ImageIcon,
  Video,
  FileType,
  Loader2,
  Calendar,
  Clock,
  CheckSquare,
  AlertCircle,
  X
} from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface TaskStep {
  id: string
  task_id: string
  step_number: number
  title: string
  description: string | null
  submission_type: string
  allowed_types: string[] | null
  is_required: boolean
  max_file_size: number | null
}

interface TaskCompletion {
  id?: string
  step_id: string
  submission_type: string | null
  text_content: string | null
  file_url: string | null
  link_url: string | null
  file_urls: string[] | null
  is_completed: boolean
}

interface Task {
  id: string
  title: string
  description: string | null
  due_date: string | null
  created_at: string
  is_active: boolean
  assignment_id: string
  assignment_status: string
  assigned_at: string
  steps: TaskStep[]
  completions: Map<string, TaskCompletion>
}

export default function StudentTasksPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [finalSubmitting, setFinalSubmitting] = useState(false)
  // Local state for input values per step
  const [stepInputs, setStepInputs] = useState<Map<string, string>>(new Map())

  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        await loadTasks(user.id)
      }
      setLoading(false)
    }

    getUser()
  }, [])

  const loadTasks = async (studentId: string) => {
    try {
      // Get assignments for this student
      const { data: assignments, error: assignError } = await supabase
        .from('task_assignments')
        .select('id, task_id, status, assigned_at')
        .eq('student_id', studentId)
        .order('assigned_at', { ascending: false })

      if (assignError) {
        console.error('Error loading assignments:', assignError)
        return
      }

      if (!assignments || assignments.length === 0) {
        setTasks([])
        return
      }

      // Get tasks
      const taskIds = assignments.map(a => a.task_id)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, description, due_date, created_at, is_active')
        .in('id', taskIds)

      if (tasksError) {
        console.error('Error loading tasks:', tasksError)
        return
      }

      // Get steps for these tasks
      const { data: stepsData, error: stepsError } = await supabase
        .from('task_steps')
        .select('*')
        .in('task_id', taskIds)
        .order('step_number', { ascending: true })

      if (stepsError) {
        console.error('Error loading steps:', stepsError)
        return
      }

      // Get completions for these assignments
      const assignmentIds = assignments.map(a => a.id)
      const { data: completionsData, error: completionsError } = await supabase
        .from('task_step_completions')
        .select('*')
        .in('assignment_id', assignmentIds)

      if (completionsError && completionsError.code !== 'PGRST116') {
        console.error('Error loading completions:', completionsError)
      }

      // Organize data
      const assignmentMap = new Map(assignments.map(a => [a.task_id, a]))
      const stepsByTask = new Map<string, TaskStep[]>()
      stepsData?.forEach(step => {
        if (!stepsByTask.has(step.task_id)) {
          stepsByTask.set(step.task_id, [])
        }
        stepsByTask.get(step.task_id)!.push(step)
      })

      // Create completions map by assignment and step
      const completionsByAssignment = new Map<string, Map<string, TaskCompletion>>()
      completionsData?.forEach(completion => {
        if (!completionsByAssignment.has(completion.assignment_id)) {
          completionsByAssignment.set(completion.assignment_id, new Map())
        }
        completionsByAssignment.get(completion.assignment_id)!.set(
          completion.step_id,
          completion
        )
      })

      const transformedTasks: Task[] = tasksData?.map(task => {
        const assignment = assignmentMap.get(task.id)!
        const steps = stepsByTask.get(task.id) || []
        const completions = completionsByAssignment.get(assignment.id) || new Map()

        return {
          ...task,
          assignment_id: assignment.id,
          assignment_status: assignment.status,
          assigned_at: assignment.assigned_at,
          steps,
          completions
        }
      }) || []

      setTasks(transformedTasks)
    } catch (error) {
      console.error('Error in loadTasks:', error)
    }
  }

  const handleStepSubmit = async (task: Task, step: TaskStep, data: Partial<TaskCompletion>) => {
    if (!user) return

    setSubmitting(step.id)

    try {
      // Validate assignment_id exists
      if (!task.assignment_id) {
        throw new Error('Task assignment not found. Please refresh the page and try again.')
      }

      // Verify the assignment exists in the database
      const { data: assignmentCheck, error: assignmentError } = await supabase
        .from('task_assignments')
        .select('id')
        .eq('id', task.assignment_id)
        .single()

      if (assignmentError || !assignmentCheck) {
        console.error('Assignment validation failed:', assignmentError)
        throw new Error('Task assignment no longer exists. Please refresh the page.')
      }

      const existingCompletion = task.completions.get(step.id)

      const completionData = {
        assignment_id: task.assignment_id,
        step_id: step.id,
        submission_type: step.submission_type,
        text_content: data.text_content || null,
        file_url: data.file_url || null,
        link_url: data.link_url || null,
        file_urls: data.file_urls || null,
        is_completed: data.is_completed ?? false,
        completed_at: data.is_completed ? new Date().toISOString() : null,
      }

      if (existingCompletion?.id) {
        // Update
        const { error } = await supabase
          .from('task_step_completions')
          .update({
            ...completionData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCompletion.id)

        if (error) throw error
      } else {
        // Insert
        const { error } = await supabase
          .from('task_step_completions')
          .insert(completionData)

        if (error) throw error
      }

      // Update assignment status based on completion
      const allSteps = task.steps
      const requiredSteps = allSteps.filter(s => s.is_required)

      // Clear the input from local state after successful submission
      const newInputs = new Map(stepInputs)
      newInputs.delete(step.id)
      newInputs.delete(`${step.id}_text`)
      newInputs.delete(`${step.id}_link`)
      setStepInputs(newInputs)

      // Reload to get latest completions and update state
      await loadTasks(user.id)

      // Manually refresh the selected task from database to get the latest completion
      if (selectedTask?.id === task.id) {
        const { data: freshTask } = await supabase
          .from('tasks')
          .select('id, title, description, due_date, created_at, is_active')
          .eq('id', task.id)
          .single()

        if (freshTask) {
          const { data: freshSteps } = await supabase
            .from('task_steps')
            .select('*')
            .eq('task_id', task.id)
            .order('step_number', { ascending: true })

          const { data: freshCompletions } = await supabase
            .from('task_step_completions')
            .select('*')
            .eq('assignment_id', task.assignment_id)

          const completionsMap = new Map<string, TaskCompletion>()
          freshCompletions?.forEach(completion => {
            completionsMap.set(completion.step_id, completion)
          })

          setSelectedTask({
            ...freshTask,
            assignment_id: task.assignment_id,
            assignment_status: task.assignment_status,
            assigned_at: task.assigned_at,
            steps: freshSteps || [],
            completions: completionsMap
          })
        }
      }

      // Update status to in_progress if this is the first step completed
      const updatedTask = tasks.find(t => t.id === task.id)
      if (updatedTask && updatedTask.assignment_status === 'assigned') {
        await supabase
          .from('task_assignments')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString()
          })
          .eq('id', task.assignment_id)
      }

    } catch (error: any) {
      console.error('Error submitting step:', error)
      console.error('Task assignment_id:', task.assignment_id)
      console.error('Step ID:', step.id)
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred'
      alert(`Error submitting step: ${errorMessage}`)
    } finally {
      setSubmitting(null)
    }
  }

  const handleFinalSubmit = async (task: Task) => {
    if (!user) return

    // Verify all required steps are completed
    const requiredSteps = task.steps.filter(s => s.is_required)
    const completedRequiredSteps = requiredSteps.filter(s =>
      task.completions.get(s.id)?.is_completed
    )

    if (completedRequiredSteps.length !== requiredSteps.length) {
      alert('Please complete all required steps before submitting the task.')
      return
    }

    const confirmSubmit = window.confirm(
      'Are you sure you want to submit this task? Once submitted, you cannot make any further changes.'
    )
    if (!confirmSubmit) return

    setFinalSubmitting(true)

    try {
      // Mark task as completed
      await supabase
        .from('task_assignments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', task.assignment_id)

      // Award points
      const result = await awardPoints({
        userId: user.id,
        actionType: 'task_submission',
        referenceId: task.id,
        referenceType: 'task',
        description: `Completed task: ${task.title}`
      })

      // Reload tasks to reflect completion
      await loadTasks(user.id)

      // Close dialog
      setSelectedTask(null)

      // Show success message
      if (result.success && result.points > 0) {
        alert(`Task submitted successfully! You earned ${result.points} points! 🎉`)
      } else {
        alert('Task submitted successfully!')
      }
    } catch (error: any) {
      console.error('Error submitting task:', error)
      alert(`Error submitting task: ${error?.message || 'Unknown error'}`)
    } finally {
      setFinalSubmitting(false)
    }
  }

  const handleCheckboxToggle = async (task: Task, step: TaskStep) => {
    const completion = task.completions.get(step.id)
    const newCompletedState = !completion?.is_completed

    // Prevent unchecking if the overall task is completed (to avoid point abuse)
    if (task.assignment_status === 'completed' && !newCompletedState) {
      alert('Cannot uncheck a step once the task is completed. Use the delete button to remove your submission if needed.')
      return
    }

    await handleStepSubmit(task, step, {
      is_completed: newCompletedState,
      text_content: completion?.text_content,
      file_url: completion?.file_url,
      link_url: completion?.link_url,
      file_urls: completion?.file_urls
    })
  }

  const handleDeleteSubmission = async (task: Task, step: TaskStep) => {
    if (!user) return

    // Prevent deletion if the overall task is completed
    if (task.assignment_status === 'completed') {
      alert('Cannot delete submissions after the task is completed.')
      return
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this submission? This will uncheck the step.')
    if (!confirmDelete) return

    setSubmitting(step.id)

    try {
      const existingCompletion = task.completions.get(step.id)

      if (existingCompletion?.id) {
        // Delete the completion record
        const { error } = await supabase
          .from('task_step_completions')
          .delete()
          .eq('id', existingCompletion.id)

        if (error) throw error

        // Clear from local state
        const newInputs = new Map(stepInputs)
        newInputs.delete(step.id)
        newInputs.delete(`${step.id}_text`)
        newInputs.delete(`${step.id}_link`)
        setStepInputs(newInputs)

        // Reload tasks
        await loadTasks(user.id)

        // Refresh selected task
        if (selectedTask?.id === task.id) {
          const { data: freshTask } = await supabase
            .from('tasks')
            .select('id, title, description, due_date, created_at, is_active')
            .eq('id', task.id)
            .single()

          if (freshTask) {
            const { data: freshSteps } = await supabase
              .from('task_steps')
              .select('*')
              .eq('task_id', task.id)
              .order('step_number', { ascending: true })

            const { data: freshCompletions } = await supabase
              .from('task_step_completions')
              .select('*')
              .eq('assignment_id', task.assignment_id)

            const completionsMap = new Map<string, TaskCompletion>()
            freshCompletions?.forEach(completion => {
              completionsMap.set(completion.step_id, completion)
            })

            setSelectedTask({
              ...freshTask,
              assignment_id: task.assignment_id,
              assignment_status: task.assignment_status,
              assigned_at: task.assigned_at,
              steps: freshSteps || [],
              completions: completionsMap
            })
          }
        }
      }
    } catch (error: any) {
      console.error('Error deleting submission:', error)
      alert(`Error deleting submission: ${error?.message || 'Unknown error'}`)
    } finally {
      setSubmitting(null)
    }
  }

  const renderSubmissionInterface = (task: Task, step: TaskStep) => {
    const completion = task.completions.get(step.id)
    const isCompleted = completion?.is_completed || false
    const currentValue = stepInputs.get(step.id) ?? completion?.text_content ?? ''

    if (step.submission_type === 'text') {
      return (
        <div className="space-y-2">
          <Textarea
            placeholder="Enter your answer..."
            value={currentValue}
            onChange={(e) => {
              const newInputs = new Map(stepInputs)
              newInputs.set(step.id, e.target.value)
              setStepInputs(newInputs)
            }}
            disabled={isCompleted}
            className={cn(isCompleted && "opacity-50")}
            rows={4}
          />
          {!isCompleted && (
            <Button
              size="sm"
              onClick={() => {
                handleStepSubmit(task, step, {
                  text_content: currentValue,
                  is_completed: true
                })
              }}
              disabled={!currentValue.trim()}
            >
              Save Answer
            </Button>
          )}
        </div>
      )
    }

    if (step.submission_type === 'link') {
      const linkValue = stepInputs.get(step.id) ?? completion?.link_url ?? ''

      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <LinkIcon className="h-5 w-5 text-muted-foreground mt-2" />
            <Input
              type="url"
              placeholder="Enter URL..."
              value={linkValue}
              onChange={(e) => {
                const newInputs = new Map(stepInputs)
                newInputs.set(step.id, e.target.value)
                setStepInputs(newInputs)
              }}
              disabled={isCompleted}
              className={cn(isCompleted && "opacity-50")}
            />
          </div>
          {!isCompleted && (
            <Button
              size="sm"
              onClick={() => {
                handleStepSubmit(task, step, {
                  link_url: linkValue,
                  is_completed: true
                })
              }}
              disabled={!linkValue.trim()}
            >
              Save Link
            </Button>
          )}
        </div>
      )
    }

    if (['image', 'video', 'pdf', 'file'].includes(step.submission_type)) {
      return (
        <div className="space-y-2">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            {completion?.file_url ? (
              <div className="space-y-2">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
                <p className="text-sm font-medium">File uploaded and marked as complete</p>
                <a
                  href={completion.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline block"
                >
                  View uploaded file
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Upload {step.submission_type}
                  {step.max_file_size && ` (Max ${step.max_file_size}MB)`}
                </p>
                <input
                  id={`file-input-${step.id}`}
                  type="file"
                  disabled={isCompleted || uploading === step.id}
                  accept={
                    step.submission_type === 'image' ? 'image/*' :
                    step.submission_type === 'video' ? 'video/*' :
                    step.submission_type === 'pdf' ? 'application/pdf' :
                    '*/*'
                  }
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file || !user) return

                    // Check file size
                    if (step.max_file_size) {
                      const fileSizeMB = file.size / (1024 * 1024)
                      if (fileSizeMB > step.max_file_size) {
                        alert(`File size exceeds ${step.max_file_size}MB limit`)
                        e.target.value = ''
                        return
                      }
                    }

                    setUploading(step.id)

                    try {
                      // Upload file
                      const result = await uploadTaskFile(
                        file,
                        user.id,
                        task.id,
                        step.id
                      )

                      if (result.error) {
                        alert('Error uploading file: ' + result.error)
                        return
                      }

                      // Save file URL and mark as completed
                      await handleStepSubmit(task, step, {
                        file_url: result.url,
                        is_completed: true
                      })

                      // Clear the input
                      e.target.value = ''
                    } catch (error) {
                      console.error('Upload error:', error)
                      alert('Failed to upload file')
                    } finally {
                      setUploading(null)
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById(`file-input-${step.id}`)?.click()}
                  disabled={isCompleted || uploading === step.id}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Choose File
                </Button>
                {uploading === step.id && (
                  <div className="flex items-center gap-2 justify-center mt-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Uploading...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }

    if (step.submission_type === 'multiple') {
      const allowedTypes = step.allowed_types || []
      const textKey = `${step.id}_text`
      const linkKey = `${step.id}_link`
      const textValue = stepInputs.get(textKey) ?? completion?.text_content ?? ''
      const linkValue = stepInputs.get(linkKey) ?? completion?.link_url ?? ''

      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You can submit: {allowedTypes.join(', ')}
          </p>

          {allowedTypes.includes('text') && (
            <div>
              <label className="text-xs font-medium">Text Response</label>
              <Textarea
                placeholder="Enter text..."
                value={textValue}
                onChange={(e) => {
                  const newInputs = new Map(stepInputs)
                  newInputs.set(textKey, e.target.value)
                  setStepInputs(newInputs)
                }}
                disabled={isCompleted}
                className={cn(isCompleted && "opacity-50")}
                rows={3}
              />
            </div>
          )}

          {allowedTypes.includes('link') && (
            <div>
              <label className="text-xs font-medium">URL Link</label>
              <Input
                type="url"
                placeholder="Enter URL..."
                value={linkValue}
                onChange={(e) => {
                  const newInputs = new Map(stepInputs)
                  newInputs.set(linkKey, e.target.value)
                  setStepInputs(newInputs)
                }}
                disabled={isCompleted}
                className={cn(isCompleted && "opacity-50")}
              />
            </div>
          )}

          {allowedTypes.some(t => ['image', 'video', 'pdf'].includes(t)) && (
            <div>
              <label className="text-xs font-medium">File Upload</label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  id={`multi-file-input-${step.id}`}
                  type="file"
                  disabled={isCompleted}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById(`multi-file-input-${step.id}`)?.click()}
                  disabled={isCompleted}
                  className={cn("gap-2", isCompleted && "opacity-50")}
                >
                  <Upload className="h-4 w-4" />
                  Choose File
                </Button>
              </div>
            </div>
          )}

          {!isCompleted && (
            <Button
              size="sm"
              onClick={() => {
                handleStepSubmit(task, step, {
                  text_content: textValue || null,
                  link_url: linkValue || null,
                  is_completed: true
                })
              }}
              disabled={!textValue.trim() && !linkValue.trim()}
            >
              Submit All
            </Button>
          )}
        </div>
      )
    }

    return null
  }

  const getStepIcon = (submissionType: string) => {
    switch (submissionType) {
      case 'text': return <FileText className="h-4 w-4" />
      case 'link': return <LinkIcon className="h-4 w-4" />
      case 'image': return <ImageIcon className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'pdf': return <FileType className="h-4 w-4" />
      case 'file': return <Upload className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getTaskProgress = (task: Task) => {
    const totalSteps = task.steps.length
    const completedSteps = task.steps.filter(s =>
      task.completions.get(s.id)?.is_completed
    ).length
    return { total: totalSteps, completed: completedSteps }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isDueSoon = (dueDate: string | null) => {
    if (!dueDate) return false
    const due = new Date(dueDate)
    const now = new Date()
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffHours > 0 && diffHours < 48 // Due within 48 hours
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="overflow-hidden bg-slate-50 dark:bg-black min-h-screen">
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

        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">My Tasks</h1>
            <p className="text-muted-foreground mt-1">
              Complete tasks assigned by your mentor
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasks.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter(t => t.assignment_status === 'in_progress').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {tasks.filter(t => t.assignment_status === 'completed').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Due Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {tasks.filter(t => isDueSoon(t.due_date)).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tasks List */}
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tasks assigned</h3>
                <p className="text-sm text-muted-foreground">
                  Your mentor hasn't assigned any tasks yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const progress = getTaskProgress(task)
                const progressPercent = task.steps.length > 0
                  ? (progress.completed / progress.total) * 100
                  : 0

                return (
                  <Card
                    key={task.id}
                    className={cn(
                      "transition-all cursor-pointer hover:shadow-lg hover:border-primary/50",
                      task.assignment_status === 'completed' && "border-green-500 bg-green-50/50 dark:bg-green-950/20"
                    )}
                    onClick={() => setSelectedTask(task)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className={cn(
                              task.assignment_status === 'completed' && "line-through opacity-60"
                            )}>
                              {task.title}
                            </CardTitle>
                            {task.assignment_status === 'completed' && (
                              <Badge className="bg-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                            {task.assignment_status === 'in_progress' && (
                              <Badge variant="outline" className="border-blue-500 text-blue-600">
                                In Progress
                              </Badge>
                            )}
                            {task.assignment_status === 'assigned' && (
                              <Badge variant="outline">
                                Not Started
                              </Badge>
                            )}
                          </div>

                          {task.description && (
                            <CardDescription className={cn(
                              task.assignment_status === 'completed' && "line-through opacity-50"
                            )}>
                              {task.description}
                            </CardDescription>
                          )}

                          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Assigned {new Date(task.assigned_at).toLocaleDateString()}</span>
                            </div>

                            {task.due_date && (
                              <div className={cn(
                                "flex items-center gap-1",
                                isOverdue(task.due_date) && "text-red-600 font-medium",
                                isDueSoon(task.due_date) && "text-orange-600 font-medium"
                              )}>
                                <Clock className="h-4 w-4" />
                                <span>Due {formatDate(task.due_date)}</span>
                                {isOverdue(task.due_date) && (
                                  <AlertCircle className="h-4 w-4 ml-1" />
                                )}
                              </div>
                            )}

                            <Badge variant="outline">
                              {progress.completed}/{progress.total} steps
                            </Badge>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={cn(
                                  "h-2 rounded-full transition-all",
                                  progressPercent === 100 ? "bg-green-600" : "bg-blue-600"
                                )}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Task Detail Dialog */}
          <Dialog open={selectedTask !== null} onOpenChange={(open) => !open && setSelectedTask(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              {selectedTask && (
                <>
                  <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <DialogTitle className="text-2xl mb-2">
                          {selectedTask.title}
                        </DialogTitle>
                        {selectedTask.description && (
                          <DialogDescription className="text-base">
                            {selectedTask.description}
                          </DialogDescription>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {selectedTask.assignment_status === 'completed' && (
                          <Badge className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                        {selectedTask.assignment_status === 'in_progress' && (
                          <Badge variant="outline" className="border-blue-500 text-blue-600">
                            In Progress
                          </Badge>
                        )}
                        {selectedTask.assignment_status === 'assigned' && (
                          <Badge variant="outline">
                            Not Started
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Task Info */}
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Assigned {new Date(selectedTask.assigned_at).toLocaleDateString()}</span>
                      </div>

                      {selectedTask.due_date && (
                        <div className={cn(
                          "flex items-center gap-1",
                          isOverdue(selectedTask.due_date) && "text-red-600 font-medium",
                          isDueSoon(selectedTask.due_date) && "text-orange-600 font-medium"
                        )}>
                          <Clock className="h-4 w-4" />
                          <span>Due {formatDate(selectedTask.due_date)}</span>
                          {isOverdue(selectedTask.due_date) && (
                            <AlertCircle className="h-4 w-4 ml-1" />
                          )}
                        </div>
                      )}

                      <Badge variant="outline">
                        {getTaskProgress(selectedTask).completed}/{getTaskProgress(selectedTask).total} steps completed
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            getTaskProgress(selectedTask).completed === getTaskProgress(selectedTask).total
                              ? "bg-green-600"
                              : "bg-blue-600"
                          )}
                          style={{
                            width: `${
                              selectedTask.steps.length > 0
                                ? (getTaskProgress(selectedTask).completed / getTaskProgress(selectedTask).total) * 100
                                : 0
                            }%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Locked Status Warning */}
                    {selectedTask.assignment_status === 'completed' && (
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-medium">This task has been submitted and is now locked. No further edits are possible.</span>
                        </div>
                      </div>
                    )}
                  </DialogHeader>

                  {/* Task Steps */}
                  <div className="space-y-4 mt-6">
                    {selectedTask.steps.map((step) => {
                      const completion = selectedTask.completions.get(step.id)
                      const isCompleted = completion?.is_completed || false

                      return (
                        <div
                          key={step.id}
                          className={cn(
                            "p-4 border rounded-lg transition-all",
                            isCompleted && "bg-gray-50 dark:bg-gray-900/50 opacity-60"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <button
                              onClick={() => handleCheckboxToggle(selectedTask, step)}
                              disabled={submitting === step.id || selectedTask.assignment_status === 'completed'}
                              className={cn(
                                "mt-1",
                                selectedTask.assignment_status === 'completed' && "cursor-not-allowed opacity-70"
                              )}
                            >
                              {submitting === step.id ? (
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              ) : isCompleted ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-400 hover:text-primary transition-colors" />
                              )}
                            </button>

                            <div className="flex-1">
                              {/* Step Header */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Step {step.step_number}
                                </span>
                                <Badge variant="outline" className="gap-1">
                                  {getStepIcon(step.submission_type)}
                                  <span className="capitalize">{step.submission_type}</span>
                                </Badge>
                                {step.is_required && (
                                  <Badge variant="destructive" className="text-xs">
                                    Required
                                  </Badge>
                                )}
                              </div>

                              {/* Step Title */}
                              <h4 className={cn(
                                "font-semibold mb-1",
                                isCompleted && "line-through"
                              )}>
                                {step.title}
                              </h4>

                              {/* Step Description */}
                              {step.description && (
                                <p className={cn(
                                  "text-sm text-muted-foreground mb-3",
                                  isCompleted && "line-through"
                                )}>
                                  {step.description}
                                </p>
                              )}

                              {/* Submission Interface */}
                              {!isCompleted && (
                                <div className="mt-3">
                                  {renderSubmissionInterface(selectedTask, step)}
                                </div>
                              )}

                              {/* Completed Status */}
                              {isCompleted && completion && (
                                <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-medium">
                                      <CheckCircle2 className="h-4 w-4" />
                                      <span>Completed</span>
                                    </div>
                                    {selectedTask.assignment_status !== 'completed' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteSubmission(selectedTask, step)}
                                        disabled={submitting === step.id}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 h-7 px-2"
                                      >
                                        {submitting === step.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            <X className="h-3 w-3 mr-1" />
                                            Delete
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                  {completion.text_content && (
                                    <p className="text-sm mt-2">
                                      <span className="font-medium">Your answer:</span> {completion.text_content}
                                    </p>
                                  )}
                                  {completion.link_url && (
                                    <a
                                      href={completion.link_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:underline block mt-2"
                                    >
                                      {completion.link_url}
                                    </a>
                                  )}
                                  {completion.file_url && (
                                    <a
                                      href={completion.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:underline block mt-2"
                                    >
                                      View submitted file
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Final Submit Button */}
                  {selectedTask.assignment_status !== 'completed' && (() => {
                    const requiredSteps = selectedTask.steps.filter(s => s.is_required)
                    const completedRequiredSteps = requiredSteps.filter(s =>
                      selectedTask.completions.get(s.id)?.is_completed
                    )
                    const allRequiredComplete = completedRequiredSteps.length === requiredSteps.length && requiredSteps.length > 0

                    if (!allRequiredComplete) {
                      return (
                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                Complete all required steps to submit this task
                              </p>
                              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                {completedRequiredSteps.length} of {requiredSteps.length} required steps completed
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div className="mt-6 space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-medium mb-2">
                            <CheckCircle2 className="h-5 w-5" />
                            <span>All required steps completed!</span>
                          </div>
                          <p className="text-xs text-green-600 dark:text-green-300">
                            Review your work and click the button below to submit your task.
                          </p>
                        </div>

                        <Button
                          onClick={() => handleFinalSubmit(selectedTask)}
                          disabled={finalSubmitting}
                          className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                        >
                          {finalSubmitting ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Submitting Task...
                            </>
                          ) : (
                            <>
                              <CheckSquare className="h-5 w-5 mr-2" />
                              Submit Task
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                          Once submitted, you cannot make any changes to this task.
                        </p>
                      </div>
                    )
                  })()}
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </main>
  )
}
