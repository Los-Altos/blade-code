import { Sidebar } from './Sidebar'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { FileCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { FilePreview } from '@/components/preview/FilePreview'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { isSidebarOpen, isFilePreviewOpen, toggleFilePreview } = useAppStore()

  return (
    <div className="flex h-screen overflow-hidden">
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-[260px]" : "w-[64px]",
          "overflow-hidden"
        )}
      >
        <div className={cn("transition-all duration-300 ease-in-out", isSidebarOpen ? "w-[260px]" : "w-[64px]")}>
           <Sidebar />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b flex items-center px-8 gap-4 bg-background z-10">
          <div className="font-normal text-sm text-zinc-500">~/session/active</div>
          <div className="ml-auto">
             <Button variant="ghost" size="icon" onClick={toggleFilePreview} className={cn(isFilePreviewOpen && "bg-accent", "text-zinc-500 hover:text-zinc-300")}>
               <FileCode className="h-4 w-4" />
             </Button>
          </div>
        </header>
        <main className="flex-1 overflow-hidden relative flex">
            <div className="flex-1 flex flex-col min-w-0 relative">
                {children}
            </div>
            {isFilePreviewOpen && (
                <FilePreview />
            )}
        </main>
      </div>
      <SettingsModal />
    </div>
  )
}
