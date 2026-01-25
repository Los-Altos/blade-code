import { useSessionStore, type TodoItem } from '@/store/SessionStore'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function TodoItemRow({ item }: { item: TodoItem }) {
  const statusIcon = {
    pending: <Circle className="h-4 w-4 text-zinc-500" />,
    in_progress: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  }

  const priorityColor = {
    high: 'border-l-red-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-zinc-500',
  }

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 border-l-2 bg-zinc-900/50',
      priorityColor[item.priority],
      item.status === 'completed' && 'opacity-60'
    )}>
      {statusIcon[item.status]}
      <span className={cn(
        'text-sm',
        item.status === 'completed' && 'line-through text-zinc-500'
      )}>
        {item.content}
      </span>
    </div>
  )
}

export function TodoList() {
  const { todos } = useSessionStore()

  if (todos.length === 0) return null

  const completed = todos.filter(t => t.status === 'completed').length
  const total = todos.length

  return (
    <div className="mx-4 mb-4 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
        <span className="text-sm font-medium text-zinc-300">Tasks</span>
        <span className="text-xs text-zinc-500">{completed}/{total} completed</span>
      </div>
      <div className="divide-y divide-zinc-800/50">
        {todos.map((item) => (
          <TodoItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
