import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { fetchUnreadCount, fetchNotifications, markNotificationRead } from '@/api/tenant'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export default function NotificationBell() {
  const queryClient = useQueryClient()

  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => fetchUnreadCount().then((r) => r.data.data.count),
    refetchInterval: 30_000,
  })

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => fetchNotifications().then((r) => r.data.data),
    refetchInterval: 30_000,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unreadCount = countData ?? 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-8 w-8 rounded-full border-border/70 bg-card/60 backdrop-blur-md shadow-xs hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all duration-200"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-88 rounded-2xl shadow-elevated p-1.5">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 text-xs font-bold uppercase tracking-wider text-foreground">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {unreadCount} unread
            </span>
          )}
        </div>
        <DropdownMenuSeparator className="my-1" />
        {!notifications || notifications.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
            <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center">
              <Inbox className="h-5 w-5 opacity-50" />
            </div>
            <p className="text-xs font-medium">No new notifications</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1 py-1">
            {notifications.slice(0, 10).map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={cn(
                  'flex flex-col items-start gap-1 p-2.5 rounded-xl cursor-pointer transition-all duration-150',
                  !n.is_read
                    ? 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary'
                    : 'hover:bg-accent/60 opacity-80'
                )}
                onClick={() => !n.is_read && markRead.mutate(n.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-xs text-foreground leading-tight">{n.title}</span>
                  {!n.is_read && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                {n.body && (
                  <span className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {n.body}
                  </span>
                )}
                {!n.is_read && (
                  <span className="flex items-center gap-1 text-[10px] text-primary font-medium mt-0.5">
                    <CheckCheck className="h-3 w-3" /> Mark as read
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
