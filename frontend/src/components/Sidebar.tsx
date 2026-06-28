import { useState } from 'react'
import { Activity, BarChart3, Table2, Zap, ChevronLeft, ChevronRight, Settings, Terminal } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'

interface NavItem {
  label: string
  icon: React.ElementType
  active?: boolean
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', icon: BarChart3, active: true },
  { label: 'Traces', icon: Activity },
  { label: 'Models', icon: Zap },
  { label: 'API Docs', icon: Terminal },
]

const bottomNav: NavItem[] = [
  { label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 border-r border-sidebar-border bg-sidebar transition-all duration-200 z-10",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-14 border-b border-sidebar-border px-3",
        collapsed ? "justify-center" : "px-4"
      )}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Activity size={15} />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm text-sidebar-foreground tracking-tight">
              Observability
            </span>
          )}
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {mainNav.map((item) => (
          <button
            key={item.label}
            className={cn(
              "flex items-center w-full gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              item.active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon size={17} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom Nav */}
      <div className={cn("py-3 px-2 space-y-0.5 border-t border-sidebar-border")}>
        {bottomNav.map((item) => (
          <button
            key={item.label}
            className="flex items-center w-full gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
          >
            <item.icon size={17} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="icon"
          className="w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>
    </aside>
  )
}
