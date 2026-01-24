import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/AppStore'
import { ChevronLeft, Hash, Plus, Settings, Terminal } from 'lucide-react'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const { toggleSettings, toggleSidebar, isSidebarOpen } = useAppStore()

  if (!isSidebarOpen) {
    return (
      <div className={cn("h-screen flex flex-col border-r bg-sidebar border-border/50 items-center py-4 gap-4 w-[64px]", className)}>
        {/* Logo Area */}
        <div className="h-10 w-10 flex items-center justify-center">
            <div className="h-6 w-6 rounded bg-green-500 flex items-center justify-center cursor-pointer" onClick={toggleSidebar}>
                <div className="w-3 h-3 bg-black rounded-sm" />
            </div>
        </div>

        {/* New Chat Button */}
        <Button 
            size="icon"
            className="h-10 w-10 rounded-md bg-green-500 hover:bg-green-600 text-white shadow-none border-0" 
        >
          <Plus className="h-5 w-5 stroke-[3]" />
        </Button>

        {/* Navigation */}
        <div className="flex-1 flex flex-col gap-2 w-full items-center">
            <Button 
                variant="ghost" 
                size="icon"
                className="h-10 w-10 rounded-md bg-zinc-900 text-green-500 hover:bg-zinc-900/80 hover:text-green-500"
            >
              <Terminal className="h-5 w-5" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon"
                className="h-10 w-10 rounded-md text-zinc-400 hover:text-zinc-100"
            >
              <Hash className="h-5 w-5" />
            </Button>
        </div>

        {/* Settings */}
        <div className="w-full flex justify-center pb-2">
            <Button 
                variant="ghost" 
                size="icon"
                className="h-10 w-10 rounded-md text-zinc-400 hover:text-zinc-100"
                onClick={toggleSettings}
            >
              <Settings className="h-5 w-5" />
            </Button>
        </div>

        {/* User Area */}
        <div className="mt-auto">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                <span className="text-xs text-zinc-200">U</span>
            </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("h-screen flex flex-col border-r bg-sidebar border-border/50", className)}>
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded bg-green-500 flex items-center justify-center">
                <div className="w-3 h-3 bg-black rounded-sm" />
            </div>
            <span className="font-semibold text-base tracking-tight text-foreground">blade_web</span>
        </div>
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded bg-zinc-900 text-zinc-500 hover:text-zinc-300"
            onClick={toggleSidebar}
        >
            <ChevronLeft className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-4 py-4 flex-1 flex flex-col px-4">
        {/* New Chat Button */}
        <Button 
            className="w-full justify-start gap-3 bg-green-500 hover:bg-green-600 text-white font-semibold h-10 shadow-none border-0" 
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          New Chat
        </Button>

        {/* Navigation */}
        <ScrollArea className="flex-1 -mx-2">
          <div className="space-y-1 p-2">
            <Button 
                variant="ghost" 
                className="w-full justify-start font-normal h-10 px-3 bg-zinc-900 text-green-500 hover:bg-zinc-900/80 hover:text-green-500"
            >
              <Terminal className="mr-3 h-4 w-4" />
              Terminal
            </Button>
            <Button 
                variant="ghost" 
                className="w-full justify-start font-normal h-10 px-3 text-zinc-400 hover:text-zinc-100"
            >
              <Hash className="mr-3 h-4 w-4" />
              History
            </Button>
          </div>
        </ScrollArea>

        {/* Settings */}
        <div className="pt-2">
            <Button 
                variant="ghost" 
                className="w-full justify-start font-normal h-10 px-3 text-zinc-400 hover:text-zinc-100"
                onClick={toggleSettings}
            >
              <Settings className="mr-3 h-4 w-4" />
              Settings
            </Button>
        </div>

        {/* User Area */}
        <div className="mt-auto pt-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                <span className="text-xs text-zinc-200">U</span>
            </div>
            <div className="flex flex-col">
                <span className="text-sm text-zinc-200 font-medium">User</span>
                <span className="text-[10px] text-green-500 font-medium">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
