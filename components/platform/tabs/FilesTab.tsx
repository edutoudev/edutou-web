import { motion } from "framer-motion"
import { Cloud, Plus, Search, FileText, Clock, Users, Star, Trash, PanelLeft, ArrowUpDown, Share2, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HeroSection } from "../HeroSection"
import { recentFiles } from "@/lib/dummydata"

export function FilesTab() {
  return (
    <div className="space-y-8 mt-0">
      <section>
        <HeroSection
          gradient="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600"
          title="Your Creative Files"
          description="Access, manage, and share all your design files in one place."
          primaryButton={
            <Button className="rounded-2xl bg-white text-blue-700 hover:bg-white/90">
              <Plus className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
          }
          secondaryButton={
            <Button className="rounded-2xl bg-white/20 backdrop-blur-md hover:bg-white/30">
              <Cloud className="mr-2 h-4 w-4" />
              Cloud Storage
            </Button>
          }
        />
      </section>

      <div className="flex flex-wrap gap-3 mb-6">
        <Button variant="outline" className="rounded-2xl">
          <FileText className="mr-2 h-4 w-4" />
          All Files
        </Button>
        <Button variant="outline" className="rounded-2xl">
          <Clock className="mr-2 h-4 w-4" />
          Recent
        </Button>
        <Button variant="outline" className="rounded-2xl">
          <Users className="mr-2 h-4 w-4" />
          Shared
        </Button>
        <Button variant="outline" className="rounded-2xl">
          <Star className="mr-2 h-4 w-4" />
          Favorites
        </Button>
        <Button variant="outline" className="rounded-2xl">
          <Trash className="mr-2 h-4 w-4" />
          Trash
        </Button>
        <div className="flex-1"></div>
        <div className="relative w-full md:w-auto mt-3 md:mt-0">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search files..." className="w-full rounded-2xl pl-9 md:w-[200px]" />
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">All Files</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-2xl">
              <PanelLeft className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="rounded-2xl">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sort
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border overflow-hidden">
          <div className="bg-muted/50 p-3 hidden md:grid md:grid-cols-12 text-sm font-medium">
            <div className="col-span-6">Name</div>
            <div className="col-span-2">App</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2">Modified</div>
          </div>
          <div className="divide-y">
            {recentFiles.map((file) => (
              <motion.div
                key={file.name}
                whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                className="p-3 md:grid md:grid-cols-12 items-center flex flex-col md:flex-row gap-3 md:gap-0"
              >
                <div className="col-span-6 flex items-center gap-3 w-full md:w-auto">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                    {file.icon}
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    {file.shared && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Users className="mr-1 h-3 w-3" />
                        Shared with {file.collaborators} people
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-sm md:text-base">{file.app}</div>
                <div className="col-span-2 text-sm md:text-base">{file.size}</div>
                <div className="col-span-2 flex items-center justify-between w-full md:w-auto">
                  <span className="text-sm md:text-base">{file.modified}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}