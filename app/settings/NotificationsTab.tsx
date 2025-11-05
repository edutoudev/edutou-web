import { Save, Bell, Smartphone, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

interface NotificationsTabProps {
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    workflowSuccess: boolean
    workflowFailure: boolean
    weeklyReport: boolean
    securityAlerts: boolean
  }
  handleNotificationChange: (key: string, value: boolean) => void
}

export function NotificationsTab({ notifications, handleNotificationChange }: NotificationsTabProps) {
  return (
    <Card className="border-gray-200 dark:border-slate-700 reading:border-amber-300 rounded-xl shadow-sm bg-white dark:bg-slate-800 reading:bg-amber-50">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl text-gray-900 dark:text-gray-100 reading:text-amber-900">Notification Preferences</CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400 reading:text-amber-700">Choose how you want to be notified about important events</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 sm:space-y-8">
        <div className="space-y-4 sm:space-y-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900 text-base sm:text-lg">Notification Channels</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 reading:bg-amber-100/50 rounded-lg border border-gray-100 dark:border-slate-600 reading:border-amber-200">
              <div className="flex items-center gap-3 sm:gap-4">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 reading:text-amber-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900 text-sm sm:text-base">Email Notifications</div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 reading:text-amber-700 mt-0.5">Receive notifications via email</div>
                </div>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(value) => handleNotificationChange("email", value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 reading:bg-amber-100/50 rounded-lg border border-gray-100 dark:border-slate-600 reading:border-amber-200">
              <div className="flex items-center gap-3 sm:gap-4">
                <Bell className="w-5 h-5 text-cyan-600 dark:text-cyan-400 reading:text-amber-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900 text-sm sm:text-base">Push Notifications</div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 reading:text-amber-700 mt-0.5">Receive browser push notifications</div>
                </div>
              </div>
              <Switch
                checked={notifications.push}
                onCheckedChange={(value) => handleNotificationChange("push", value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 reading:bg-amber-100/50 rounded-lg border border-gray-100 dark:border-slate-600 reading:border-amber-200">
              <div className="flex items-center gap-3 sm:gap-4">
                <Smartphone className="w-5 h-5 text-teal-600 dark:text-teal-400 reading:text-amber-600 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900 text-sm sm:text-base">SMS Notifications</div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 reading:text-amber-700 mt-0.5">Receive text message alerts</div>
                </div>
              </div>
              <Switch
                checked={notifications.sms}
                onCheckedChange={(value) => handleNotificationChange("sms", value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 reading:text-amber-900 text-base sm:text-lg">Event Notifications</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 reading:bg-amber-100/50 rounded-lg border border-gray-100 dark:border-slate-600 reading:border-amber-200">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900 text-sm sm:text-base">Workflow Success</div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 reading:text-amber-700 mt-0.5">When workflows complete successfully</div>
              </div>
              <Switch
                checked={notifications.workflowSuccess}
                onCheckedChange={(value) => handleNotificationChange("workflowSuccess", value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 reading:bg-amber-100/50 rounded-lg border border-gray-100 dark:border-slate-600 reading:border-amber-200">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900 text-sm sm:text-base">Workflow Failure</div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 reading:text-amber-700 mt-0.5">When workflows fail or encounter errors</div>
              </div>
              <Switch
                checked={notifications.workflowFailure}
                onCheckedChange={(value) => handleNotificationChange("workflowFailure", value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 reading:bg-amber-100/50 rounded-lg border border-gray-100 dark:border-slate-600 reading:border-amber-200">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900 text-sm sm:text-base">Weekly Reports</div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 reading:text-amber-700 mt-0.5">Weekly summary of workflow performance</div>
              </div>
              <Switch
                checked={notifications.weeklyReport}
                onCheckedChange={(value) => handleNotificationChange("weeklyReport", value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 reading:bg-amber-100/50 rounded-lg border border-gray-100 dark:border-slate-600 reading:border-amber-200">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100 reading:text-amber-900 text-sm sm:text-base">Security Alerts</div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 reading:text-amber-700 mt-0.5">Important security and account notifications</div>
              </div>
              <Switch
                checked={notifications.securityAlerts}
                onCheckedChange={(value) => handleNotificationChange("securityAlerts", value)}
              />
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
