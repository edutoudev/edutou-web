'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2, Save, Users, ClipboardList, ChevronDown, ChevronUp, Calendar, Edit, CheckCircle2, Circle, FileText } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/platform/Header';
import { cn } from '@/lib/utils';

interface TaskStep {
  id?: string;
  step_number: number;
  title: string;
  description: string;
  submission_type: string;
  allowed_types?: string[];
  is_required: boolean;
  max_file_size?: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string;
  is_active: boolean;
  created_at: string;
  steps?: TaskStep[];
  assigned_count?: number;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
}

export default function ManageTaskPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  // New task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taskPoints, setTaskPoints] = useState(10); // Default 10 points
  const [steps, setSteps] = useState<TaskStep[]>([{
    step_number: 1,
    title: '',
    description: '',
    submission_type: 'text',
    is_required: true,
    max_file_size: 10
  }]);

  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load mentor's tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Load steps for each task
      if (tasksData && tasksData.length > 0) {
        const taskIds = tasksData.map(t => t.id);

        const { data: stepsData } = await supabase
          .from('task_steps')
          .select('*')
          .in('task_id', taskIds)
          .order('step_number');

        const { data: assignmentsData } = await supabase
          .from('task_assignments')
          .select('task_id, student_id')
          .in('task_id', taskIds);

        const stepsMap = new Map();
        (stepsData || []).forEach(step => {
          if (!stepsMap.has(step.task_id)) {
            stepsMap.set(step.task_id, []);
          }
          stepsMap.get(step.task_id).push(step);
        });

        const assignmentsMap = new Map();
        (assignmentsData || []).forEach(assignment => {
          assignmentsMap.set(
            assignment.task_id,
            (assignmentsMap.get(assignment.task_id) || 0) + 1
          );
        });

        const tasksWithSteps = tasksData.map(task => ({
          ...task,
          steps: stepsMap.get(task.id) || [],
          assigned_count: assignmentsMap.get(task.id) || 0
        }));

        setTasks(tasksWithSteps);
      }

      // Load mentor's students
      const { data: assignments } = await supabase
        .from('mentor_assignments')
        .select('student_id')
        .eq('mentor_id', user.id)
        .eq('status', 'active');

      if (assignments && assignments.length > 0) {
        const studentIds = assignments.map(a => a.student_id);

        const { data: studentsData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds)
          .order('full_name');

        setStudents(studentsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    setSteps([...steps, {
      step_number: steps.length + 1,
      title: '',
      description: '',
      submission_type: 'text',
      is_required: true,
      max_file_size: 10
    }]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Renumber steps
    newSteps.forEach((step, i) => {
      step.step_number = i + 1;
    });
    setSteps(newSteps);
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const loadTaskSubmissions = async (task: Task) => {
    try {
      // Get all assignments for this task
      const { data: assignments, error: assignError } = await supabase
        .from('task_assignments')
        .select('*')
        .eq('task_id', task.id);

      if (assignError) {
        console.error('Error loading assignments:', assignError);
        throw assignError;
      }

      console.log('Loaded assignments:', assignments);

      // Get student profiles separately
      if (assignments && assignments.length > 0) {
        const studentIds = assignments.map(a => a.student_id);
        const { data: students, error: studentsError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .in('id', studentIds);

        if (studentsError) {
          console.error('Error loading students:', studentsError);
        } else {
          // Map students to assignments
          const studentMap = new Map(students?.map(s => [s.id, s]));
          assignments.forEach(assignment => {
            assignment.student = studentMap.get(assignment.student_id);
          });
        }
      }

      // Get all steps for this task
      const { data: steps, error: stepsError } = await supabase
        .from('task_steps')
        .select('*')
        .eq('task_id', task.id)
        .order('step_number');

      if (stepsError) throw stepsError;

      // Get all completions for these assignments
      const assignmentIds = assignments?.map(a => a.id) || [];
      const { data: completions, error: completionsError } = await supabase
        .from('task_step_completions')
        .select('*')
        .in('assignment_id', assignmentIds);

      if (completionsError) {
        console.error('Error loading completions:', completionsError);
        throw completionsError;
      }

      console.log('Loaded completions:', completions);
      console.log('Assignment IDs:', assignmentIds);

      // Organize data by student
      const submissionData = assignments?.map(assignment => {
        const completionsByStep = new Map();
        completions?.forEach(c => {
          if (c.assignment_id === assignment.id) {
            completionsByStep.set(c.step_id, c);
          }
        });

        const totalSteps = steps?.length || 0;
        const completedSteps = steps?.filter(s =>
          completionsByStep.get(s.id)?.is_completed
        ).length || 0;

        return {
          assignment,
          student: assignment.student,
          steps: steps || [],
          completions: completionsByStep,
          progress: {
            total: totalSteps,
            completed: completedSteps,
            percentage: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0
          }
        };
      }) || [];

      setSubmissions(submissionData);
      setSelectedTask(task);
      setShowSubmissionsDialog(true);
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load submissions',
        variant: 'destructive',
      });
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a task title',
        variant: 'destructive',
      });
      return;
    }

    if (steps.some(s => !s.title.trim())) {
      toast({
        title: 'Error',
        description: 'All steps must have a title',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          mentor_id: user.id,
          title: taskTitle,
          description: taskDescription,
          due_date: dueDate || null,
          points: taskPoints,
          is_active: true
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Create steps
      const stepsToInsert = steps.map(step => ({
        task_id: task.id,
        step_number: step.step_number,
        title: step.title,
        description: step.description,
        submission_type: step.submission_type,
        allowed_types: step.submission_type === 'multiple' ? step.allowed_types : null,
        is_required: step.is_required,
        max_file_size: ['file', 'image', 'video', 'pdf', 'multiple'].includes(step.submission_type)
          ? step.max_file_size
          : null
      }));

      const { error: stepsError } = await supabase
        .from('task_steps')
        .insert(stepsToInsert);

      if (stepsError) throw stepsError;

      // Auto-assign to all students of this mentor
      const { data: mentorStudents, error: studentsError } = await supabase
        .from('mentor_assignments')
        .select('student_id')
        .eq('mentor_id', user.id)
        .eq('status', 'active');

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        toast({
          title: 'Warning',
          description: 'Task created but could not fetch students for auto-assignment',
          variant: 'destructive',
        });
      } else if (mentorStudents && mentorStudents.length > 0) {
        // Create assignments for all students
        const assignments = mentorStudents.map(ma => ({
          task_id: task.id,
          student_id: ma.student_id,
          assigned_by: user.id,
          status: 'assigned'
        }));

        const { error: assignError } = await supabase
          .from('task_assignments')
          .insert(assignments);

        if (assignError) {
          console.error('Error assigning tasks:', assignError);
          toast({
            title: 'Warning',
            description: `Task created but failed to assign to students: ${assignError.message}`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Success',
            description: `Task created and automatically assigned to ${mentorStudents.length} student(s)`,
          });
        }
      } else {
        // No students found
        toast({
          title: 'Success',
          description: 'Task created. No active students found to assign. You can assign students manually using the "Assign" button.',
        });
      }

      // Reset form
      setTaskTitle('');
      setTaskDescription('');
      setDueDate('');
      setTaskPoints(10);
      setSteps([{
        step_number: 1,
        title: '',
        description: '',
        submission_type: 'text',
        is_required: true,
        max_file_size: 10
      }]);

      setShowCreateDialog(false);
      await loadData();
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };


  const getSubmissionTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      text: 'Text Answer',
      file: 'Any File',
      link: 'URL Link',
      image: 'Image',
      video: 'Video',
      pdf: 'PDF',
      multiple: 'Multiple Types'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
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

        <div className="container mx-auto p-6 max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Manage Tasks
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Create and assign tasks to your students
              </p>
            </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-600">
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Create a task with multiple steps for your students
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Task Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Task Title *</Label>
                  <Input
                    id="title"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Enter task title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Describe the task..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="dark:[color-scheme:dark]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points">Leaderboard Points</Label>
                  <Input
                    id="points"
                    type="number"
                    min="0"
                    value={taskPoints}
                    onChange={(e) => setTaskPoints(parseInt(e.target.value) || 0)}
                    placeholder="Points awarded on completion"
                  />
                  <p className="text-xs text-muted-foreground">
                    Students will earn these points when they complete this task
                  </p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Task Steps</Label>
                  <Button onClick={addStep} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Step
                  </Button>
                </div>

                {steps.map((step, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold">Step {step.step_number}</Label>
                        {steps.length > 1 && (
                          <Button
                            onClick={() => removeStep(index)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Step Title *</Label>
                        <Input
                          value={step.title}
                          onChange={(e) => updateStep(index, 'title', e.target.value)}
                          placeholder="What should the student do?"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Instructions</Label>
                        <Textarea
                          value={step.description}
                          onChange={(e) => updateStep(index, 'description', e.target.value)}
                          placeholder="Detailed instructions for this step..."
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Submission Type</Label>
                          <Select
                            value={step.submission_type}
                            onValueChange={(value) => updateStep(index, 'submission_type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text Answer</SelectItem>
                              <SelectItem value="link">URL Link</SelectItem>
                              <SelectItem value="image">Image Upload</SelectItem>
                              <SelectItem value="video">Video Upload</SelectItem>
                              <SelectItem value="pdf">PDF Upload</SelectItem>
                              <SelectItem value="file">Any File</SelectItem>
                              <SelectItem value="multiple">Multiple Types</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {['file', 'image', 'video', 'pdf', 'multiple'].includes(step.submission_type) && (
                          <div className="space-y-2">
                            <Label>Max File Size (MB)</Label>
                            <Input
                              type="number"
                              value={step.max_file_size}
                              onChange={(e) => updateStep(index, 'max_file_size', parseInt(e.target.value))}
                              min={1}
                              max={100}
                            />
                          </div>
                        )}
                      </div>

                      {step.submission_type === 'multiple' && (
                        <div className="space-y-2">
                          <Label>Allowed Types (select multiple)</Label>
                          <div className="flex flex-wrap gap-2">
                            {['text', 'link', 'image', 'video', 'pdf'].map(type => (
                              <label key={type} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={step.allowed_types?.includes(type) || false}
                                  onChange={(e) => {
                                    const currentTypes = step.allowed_types || [];
                                    const newTypes = e.target.checked
                                      ? [...currentTypes, type]
                                      : currentTypes.filter(t => t !== type);
                                    updateStep(index, 'allowed_types', newTypes);
                                  }}
                                />
                                <span className="text-sm">{getSubmissionTypeLabel(type)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={step.is_required}
                          onChange={(e) => updateStep(index, 'is_required', e.target.checked)}
                        />
                        <span className="text-sm">Required step</span>
                      </label>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTask} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Task
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{tasks.length}</p>
              </div>
              <ClipboardList className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Tasks</p>
                <p className="text-3xl font-bold text-green-600">
                  {tasks.filter(t => t.is_active).length}
                </p>
              </div>
              <ClipboardList className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
                <p className="text-3xl font-bold text-purple-600">{students.length}</p>
              </div>
              <Users className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Tasks</CardTitle>
          <CardDescription>
            Manage and assign tasks to students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>No tasks created yet</p>
                <p className="text-sm">Create your first task to get started</p>
              </div>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} className="overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {task.title}
                          </h3>
                          <Badge variant={task.is_active ? "default" : "secondary"}>
                            {task.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">
                            {task.steps?.length || 0} steps
                          </Badge>
                          <Badge variant="outline">
                            <Users className="w-3 h-3 mr-1" />
                            {task.assigned_count || 0} assigned
                          </Badge>
                        </div>

                        {task.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {task.description}
                          </p>
                        )}

                        {task.due_date && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            Due: {new Date(task.due_date).toLocaleString()}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => loadTaskSubmissions(task)}
                          size="sm"
                          variant="default"
                        >
                          <ClipboardList className="w-4 h-4 mr-2" />
                          View Submissions
                        </Button>

                        <Button
                          onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                          size="sm"
                          variant="ghost"
                        >
                          {expandedTask === task.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Steps */}
                    {expandedTask === task.id && task.steps && task.steps.length > 0 && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Task Steps:</h4>
                        {task.steps.map((step) => (
                          <div key={step.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-blue-600">
                                    Step {step.step_number}
                                  </span>
                                  <h5 className="font-medium text-sm">{step.title}</h5>
                                  {step.is_required && (
                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                  )}
                                </div>
                                {step.description && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                    {step.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {getSubmissionTypeLabel(step.submission_type)}
                                  </Badge>
                                  {step.max_file_size && (
                                    <span className="text-xs text-gray-500">
                                      Max: {step.max_file_size}MB
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submissions Dialog */}
      <Dialog open={showSubmissionsDialog} onOpenChange={setShowSubmissionsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Submissions: {selectedTask?.title}</DialogTitle>
            <DialogDescription>
              View student progress and submissions for this task
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {submissions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>No students assigned to this task yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => {
                  const student = submission.student;
                  const studentName = student?.full_name || student?.email?.split('@')[0] || 'Unknown';
                  const isExpanded = selectedSubmission?.assignment.id === submission.assignment.id;

                  return (
                    <Card key={submission.assignment.id} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                              {studentName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-semibold">{studentName}</h4>
                              <p className="text-xs text-muted-foreground">{student?.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge variant={
                              submission.assignment.status === 'completed' ? 'default' :
                              submission.assignment.status === 'in_progress' ? 'secondary' :
                              'outline'
                            }>
                              {submission.assignment.status}
                            </Badge>

                            <div className="text-sm">
                              <span className="font-semibold">{submission.progress.completed}</span>
                              <span className="text-muted-foreground">/{submission.progress.total} steps</span>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedSubmission(isExpanded ? null : submission)}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-all",
                              submission.progress.percentage === 100 ? "bg-green-600" : "bg-blue-600"
                            )}
                            style={{ width: `${submission.progress.percentage}%` }}
                          />
                        </div>

                        {/* Expanded Submissions */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t space-y-4">
                            {submission.steps.map((step: any) => {
                              const completion = submission.completions.get(step.id);
                              const isCompleted = completion?.is_completed || false;

                              return (
                                <div
                                  key={step.id}
                                  className={cn(
                                    "p-4 border rounded-lg",
                                    isCompleted && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                                  )}
                                >
                                  <div className="flex items-start gap-3">
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-1" />
                                    ) : (
                                      <Circle className="h-5 w-5 text-gray-400 mt-1" />
                                    )}

                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-medium text-muted-foreground">
                                          Step {step.step_number}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          {step.submission_type}
                                        </Badge>
                                      </div>

                                      <h5 className="font-semibold mb-1">{step.title}</h5>
                                      {step.description && (
                                        <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                                      )}

                                      {/* Submission Content */}
                                      {completion && (
                                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                          {completion.text_content && (
                                            <div>
                                              <p className="text-xs font-medium text-muted-foreground mb-1">Text Response:</p>
                                              <p className="text-sm">{completion.text_content}</p>
                                            </div>
                                          )}

                                          {completion.link_url && (
                                            <div>
                                              <p className="text-xs font-medium text-muted-foreground mb-1">Link:</p>
                                              <a
                                                href={completion.link_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:underline break-all"
                                              >
                                                {completion.link_url}
                                              </a>
                                            </div>
                                          )}

                                          {completion.file_url && (
                                            <div>
                                              <p className="text-xs font-medium text-muted-foreground mb-1">File:</p>
                                              <a
                                                href={completion.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                              >
                                                <FileText className="w-4 h-4" />
                                                View File
                                              </a>
                                            </div>
                                          )}

                                          {completion.completed_at && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                              Completed: {new Date(completion.completed_at).toLocaleString()}
                                            </p>
                                          )}
                                        </div>
                                      )}

                                      {!completion && !isCompleted && (
                                        <p className="text-sm text-muted-foreground italic">Not submitted yet</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </main>
  );
}
