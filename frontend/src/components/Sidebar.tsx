import { useState } from 'react'
import {
  BarChart3, Activity, Zap, ChevronLeft, ChevronRight,
  Settings, Terminal, Search, Layers
} from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'

interface NavItem {
  label: string
  icon: React.ElementType
  active?: boolean
}

interface NavSection {
  heading?: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', icon: BarChart3, active: true },
      { label: 'Traces', icon: Search },
      { label: 'Models', icon: Layers },
    ]
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Alerts', icon: Activity },
      { label: 'API Docs', icon: Terminal },
    ]
  },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 border-r border-sidebar-border bg-sidebar transition-all duration-200 z-20",
        collapsed ? "w-[56px]" : "w-[224px]"
      )}
    >
      {/* Brand */}
      <div className={cn(
        "flex items-center h-14 border-b border-sidebar-border shrink-0",
        collapsed ? "justify-center px-2" : "px-4"
      )}>
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20">
            <Zap size={14} />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-bold text-sm text-sidebar-foreground tracking-tight">
                LLM Ops
              </span>
              <span className="text-[0.6rem] font-medium text-sidebar-foreground/40 uppercase tracking-[0.12em]">
                Observability
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Health indicator */}
      {!collapsed && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/40 px-3 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-pulse-ring" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-[0.65rem] font-medium text-sidebar-foreground/70">All systems operational</span>
        </div>
      )}

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-0.5">
            {section.heading && !collapsed && (
              <div className="px-2.5 pb-1 pt-1">
                <span className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/35">
                  {section.heading}
                </span>
              </div>
            )}
            {section.items.map((item) => (
              <button
                key={item.label}
                className={cn(
                  "flex items-center w-full gap-2.5 rounded-md px-2.5 py-2 text-[0.8125rem] font-medium transition-all duration-150",
                  item.active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon size={16} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="shrink-0 border-t border-sidebar-border px-2 py-2 space-y-1">
        <button
          className="flex items-center w-full gap-2.5 rounded-md px-2.5 py-2 text-[0.8125rem] font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <Settings size={16} className="shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>

        {/* User */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 mt-2 px-2.5 py-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/20 text-primary text-[0.6rem] font-bold">
              OR
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[0.7rem] font-medium text-sidebar-foreground/80">Operator</span>
              <span className="text-[0.6rem] text-sidebar-foreground/40">admin</span>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <div className="shrink-0 px-2 pb-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="w-full h-7 text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Button>
      </div>
    </aside>
  )
}
