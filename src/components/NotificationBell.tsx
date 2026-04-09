import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
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
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unreadCount = countData ?? 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!notifications || notifications.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          notifications.slice(0, 10).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn('flex flex-col items-start gap-0.5 py-2', !n.is_read && 'bg-muted/50')}
              onClick={() => !n.is_read && markRead.mutate(n.id)}
            >
              <span className="font-medium text-sm leading-tight">{n.title}</span>
              {n.body && (
                <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
              )}
              {!n.is_read && (
                <span className="text-xs text-primary font-medium mt-0.5">Mark as read</span>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
