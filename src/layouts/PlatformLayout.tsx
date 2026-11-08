import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, LogOut, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { platformLogout } from '@/api/platform'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/platform/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/platform/tenants', label: 'Tenants', icon: Building2 },
]

export default function PlatformLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    try {
      await platformLogout()
    } catch {
      // ignore errors on logout
    } finally {
      logout()
      navigate('/platform/login')
    }
  }

  return (
    <div className="flex h-screen bg-background/50 overflow-hidden text-foreground relative">
      {/* Antigravity Atmospheric Mesh Orbs */}
      <div className="fixed -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 dark:bg-primary/20 blur-3xl pointer-events-none -z-10 animate-pulse-slow" />
      <div className="fixed -bottom-32 left-1/4 w-96 h-96 rounded-full bg-purple-500/10 dark:bg-purple-500/15 blur-3xl pointer-events-none -z-10 animate-float" />

      {/* Sidebar */}
      <aside className="w-60 flex flex-col border-r border-white/40 dark:border-white/10 bg-card/75 dark:bg-card/50 backdrop-blur-2xl select-none shadow-[4px_0_30px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_30px_rgba(0,0,0,0.3)]">
        <div className="h-16 px-5 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Platform Admin
              </span>
              <p className="text-[10px] text-muted-foreground">Genie Cloud System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User profile & logout */}
        <div className="p-3 border-t border-border/70 bg-card/50">
          <div className="flex items-center justify-between gap-2">
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.name || 'Super Admin'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              title="Logout"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content with modern header */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="glass-header h-14 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Tenant Infrastructure & Provisioning</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main key={location.pathname} className="flex-1 overflow-auto bg-muted/20 animate-fade-in p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
