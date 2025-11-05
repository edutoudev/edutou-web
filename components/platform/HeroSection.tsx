import { motion } from "framer-motion"
import { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"


export function HeroSection({ gradient, badge, title, description, primaryButton, secondaryButton, showAnimation = false }: {
  gradient: string
  badge?: string
  title: string
  description: string
  primaryButton: ReactNode
  secondaryButton?: ReactNode
  showAnimation?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`overflow-hidden rounded-3xl ${gradient} p-8 text-white`}
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-4">
          {badge && <Badge className="bg-white/20 text-white hover:bg-white/30 rounded-xl">{badge}</Badge>}
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="max-w-[600px] text-white/80">{description}</p>
          <div className="flex flex-wrap gap-3">
            {primaryButton}
            {secondaryButton}
          </div>
        </div>
        {showAnimation && (
          <div className="hidden lg:block">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
              className="relative h-40 w-40"
            >
              <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-md" />
              <div className="absolute inset-4 rounded-full bg-white/20" />
              <div className="absolute inset-8 rounded-full bg-white/30" />
              <div className="absolute inset-12 rounded-full bg-white/40" />
              <div className="absolute inset-16 rounded-full bg-white/50" />
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  )
}