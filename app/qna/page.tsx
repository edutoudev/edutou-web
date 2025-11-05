'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  ChevronDown,
  MessageCircle,
  Lightbulb,
  HelpCircle,
  Send,
  Loader,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Copy,
  CheckCircle,
} from 'lucide-react'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/platform/Header'
import { HeroSection } from '@/components/platform/HeroSection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

const FAQ_CATEGORIES = [
  { id: 'getting-started', name: 'Getting Started', icon: Lightbulb },
  { id: 'account', name: 'Account & Profile', icon: HelpCircle },
  { id: 'features', name: 'Features & Tools', icon: Sparkles },
  { id: 'projects', name: 'Projects', icon: MessageCircle },
  { id: 'billing', name: 'Billing', icon: MessageCircle },
]

const FAQ_ITEMS = [
  {
    id: 1,
    category: 'getting-started',
    question: 'How do I get started with the platform?',
    answer:
      'Getting started is simple! First, create an account and complete your profile. Then, check out our onboarding tutorial to familiarize yourself with the main features. You can start creating projects immediately or browse templates to use as a starting point.',
    helpful: 245,
  },
  {
    id: 2,
    category: 'getting-started',
    question: 'What are the system requirements?',
    answer:
      'Our platform works on any modern web browser including Chrome, Firefox, Safari, and Edge. We recommend using the latest version for the best experience. No additional software or plugins are required.',
    helpful: 128,
  },
  {
    id: 3,
    category: 'account',
    question: 'How do I change my password?',
    answer:
      'To change your password, go to Settings > Security > Change Password. Enter your current password, then your new password twice. Make sure your new password is at least 8 characters long and includes a mix of letters, numbers, and symbols.',
    helpful: 89,
  },
  {
    id: 4,
    category: 'account',
    question: 'Can I have multiple workspaces?',
    answer:
      'Yes! With our Pro plan and above, you can create multiple workspaces. Each workspace has its own projects, team members, and settings. This is useful for managing different clients or projects separately.',
    helpful: 156,
  },
  {
    id: 5,
    category: 'features',
    question: 'What file formats are supported?',
    answer:
      'We support a wide range of formats including PNG, JPG, SVG, PDF, AI, PSD, and XD files. You can also export your work in multiple formats. Check our documentation for a complete list of supported formats and their specifications.',
    helpful: 203,
  },
  {
    id: 6,
    category: 'projects',
    question: 'How do I collaborate with team members?',
    answer:
      'You can invite team members to your projects by going to Project Settings > Team. Send them an invitation via email, and they can start collaborating immediately. Set different permission levels for different team members.',
    helpful: 187,
  },
  {
    id: 7,
    category: 'billing',
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for annual plans. You can manage your payment method in your account settings under Billing.',
    helpful: 92,
  },
  {
    id: 8,
    category: 'billing',
    question: 'Can I cancel my subscription anytime?',
    answer:
      'Yes, you can cancel your subscription anytime from your account settings. If you cancel mid-month, you will have access until the end of your billing cycle. No questions asked!',
    helpful: 234,
  },
]

interface FAQItemProps {
  item: (typeof FAQ_ITEMS)[0]
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  helpful?: boolean
}

function FAQItem({ item }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(item.answer)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className="overflow-hidden rounded-2xl border transition-all duration-300 hover:border-primary/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CardContent className="p-0">
          <button
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <h3 className="flex-1 font-semibold text-foreground hover:text-primary transition-colors">
              {item.question}
            </h3>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="flex-shrink-0"
            >
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="border-t px-4 py-4 text-sm text-muted-foreground">
                  <p className="mb-4 leading-relaxed">{item.answer}</p>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs">Was this helpful?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setHelpful(true)
                      }}
                      className={cn(
                        'h-8 rounded-full px-3',
                        helpful === true ? 'bg-green-500/20 text-green-600' : ''
                      )}
                    >
                      <ThumbsUp className="mr-1 h-3 w-3" />
                      Yes ({item.helpful})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setHelpful(false)
                      }}
                      className={cn(
                        'h-8 rounded-full px-3',
                        helpful === false ? 'bg-red-500/20 text-red-600' : ''
                      )}
                    >
                      <ThumbsDown className="mr-1 h-3 w-3" />
                      No
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopy()
                      }}
                      className="ml-auto h-8 rounded-full px-3"
                    >
                      {copied ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
}: {
  categories: (typeof FAQ_CATEGORIES)[0][]
  activeCategory: string
  onCategoryChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={activeCategory === 'all' ? 'default' : 'outline'}
        className="rounded-2xl"
        onClick={() => onCategoryChange('all')}
      >
        All Topics
      </Button>
      {categories.map(({ id, name, icon: Icon }) => (
        <Button
          key={id}
          variant={activeCategory === id ? 'default' : 'outline'}
          className="rounded-2xl"
          onClick={() => onCategoryChange(id)}
        >
          <Icon className="mr-2 h-4 w-4" />
          {name}
        </Button>
      ))}
    </div>
  )
}

function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content:
        "Hi! I'm your AI assistant. I can help you find answers to your questions about our platform. What would you like to know?",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content:
          "Great question! Based on our documentation, I can help you with that. Would you like me to provide more details or connect you with our support team?",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  return (
    <Card className="flex flex-col rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-background">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">AI Assistant</CardTitle>
            <CardDescription className="text-xs">
              Get instant answers powered by AI
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col overflow-hidden p-4">
        {/* Chat Messages */}
        <div className="mb-4 flex-1 space-y-3 overflow-y-auto">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                'flex gap-2',
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.type === 'assistant' && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-white text-xs">
                    AI
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
                  'max-w-xs rounded-2xl px-4 py-2 text-sm',
                  message.type === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground'
                )}
              >
                {message.content}
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2"
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-primary text-white text-xs">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="flex gap-1 rounded-2xl bg-muted px-4 py-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2 border-t pt-4">
          <Input
            placeholder="Ask me anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSendMessage()
            }}
            className="rounded-2xl"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            size="icon"
            className="flex-shrink-0 rounded-2xl"
          >
            {isLoading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function QAFAQPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFAQs = FAQ_ITEMS.filter((item) => {
    const matchesCategory =
      activeCategory === 'all' || item.category === activeCategory
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <main className="overflow-hidden">
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
          {/* Hero Section */}
          <section>
            <HeroSection
              gradient="bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600"
              title="Help & Support"
              description="Find answers to your questions or chat with our AI assistant."
              primaryButton={
                <Button className="rounded-2xl bg-white text-cyan-700 hover:bg-white/90">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact Support
                </Button>
              }
            />
          </section>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* FAQ Section */}
            <div className="space-y-6 lg:col-span-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl pl-9"
                />
              </div>

              {/* Category Filter */}
              <div>
                <h3 className="mb-3 text-sm font-semibold">Filter by Category</h3>
                <CategoryFilter
                  categories={FAQ_CATEGORIES}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                />
              </div>

              {/* FAQ Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">
                    {activeCategory === 'all' ? 'All FAQs' : FAQ_CATEGORIES.find((cat) => cat.id === activeCategory)?.name}
                  </h2>
                  <Badge variant="outline" className="rounded-full">
                    {filteredFAQs.length} questions
                  </Badge>
                </div>

                {filteredFAQs.length > 0 ? (
                  <div className="space-y-2">
                    {filteredFAQs.map((item) => (
                      <FAQItem key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <Card className="rounded-2xl border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <HelpCircle className="mb-4 h-12 w-12 text-muted-foreground/50" />
                      <h3 className="font-semibold">No FAQs found</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Try adjusting your search or category filter
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* AI Chat Sidebar */}
            <div className="lg:sticky lg:top-20 lg:h-fit">
              <AIChat />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}