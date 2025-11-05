'use client';

import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "@/contexts/ThemeContext"

export function PreferencesTab() {
  const { theme, setTheme } = useTheme()

  return (
    <Card className="border-gray-200 dark:border-slate-700 reading:border-amber-300 rounded-xl shadow-sm bg-white dark:bg-slate-800 reading:bg-amber-50">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl text-gray-900 dark:text-gray-100 reading:text-amber-900">Application Preferences</CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400 reading:text-amber-700">Customize your application experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 sm:space-y-8">
        <div className="space-y-4 sm:space-y-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900 text-base sm:text-lg">Appearance</h3>
          <div className="space-y-4 sm:space-y-5">
            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="theme" className="text-sm font-medium text-gray-700 dark:text-gray-300 reading:text-amber-800">Theme</Label>
              <Select value={theme} onValueChange={(value: any) => setTheme(value)}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="light">☀️ Light</SelectItem>
                  <SelectItem value="dark">🌙 Dark</SelectItem>
                  <SelectItem value="reading">📖 Reading Mode</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400 reading:text-amber-600">Choose your preferred theme for the application</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900 text-base sm:text-lg">Data & Privacy</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-slate-700/50 reading:bg-amber-100/50 border border-gray-100 dark:border-slate-600 reading:border-amber-200 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900 text-sm sm:text-base">Analytics & Usage Data</div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 reading:text-amber-700 mt-0.5">Help improve our product by sharing usage data</div>
              </div>
              <Switch defaultChecked className="self-start sm:self-auto" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-slate-700/50 reading:bg-amber-100/50 border border-gray-100 dark:border-slate-600 reading:border-amber-200 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900 text-sm sm:text-base">Marketing Communications</div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 reading:text-amber-700 mt-0.5">Receive product updates and marketing emails</div>
              </div>
              <Switch className="self-start sm:self-auto" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 dark:from-blue-500 dark:to-cyan-500 dark:hover:from-blue-600 dark:hover:to-cyan-600 reading:from-amber-600 reading:to-orange-600 reading:hover:from-amber-700 reading:hover:to-orange-700 text-white gap-2 rounded-lg px-6">
            <Save className="w-4 h-4" />
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
