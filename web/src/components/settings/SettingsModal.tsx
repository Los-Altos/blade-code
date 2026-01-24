import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppStore } from "@/store/AppStore"
import { useTheme } from "@/components/ThemeProvider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function SettingsModal() {
  const { isSettingsOpen, toggleSettings } = useAppStore()
  const { theme, setTheme } = useTheme()

  return (
    <Dialog open={isSettingsOpen} onOpenChange={toggleSettings}>
      <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="general" className="flex-1 flex">
          <TabsList className="flex flex-col h-full justify-start w-[200px] bg-muted/30 p-2 rounded-none border-r space-y-1">
            <TabsTrigger value="general" className="w-full justify-start px-3">General</TabsTrigger>
            <TabsTrigger value="models" className="w-full justify-start px-3">Models</TabsTrigger>
          </TabsList>
          <div className="flex-1 p-6 overflow-y-auto">
             <TabsContent value="general" className="mt-0 space-y-4">
                <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
             </TabsContent>
             <TabsContent value="models" className="mt-0">
                <div className="text-sm text-muted-foreground">
                    Model configuration options will appear here.
                </div>
             </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
