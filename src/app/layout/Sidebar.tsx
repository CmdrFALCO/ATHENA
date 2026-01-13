import { Link, useLocation } from '@tanstack/react-router';
import { Bird, Swords, Hammer, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useSidebarOpen, uiActions } from '@/store';

const navItems = [
  { path: '/sophia', label: 'Sophia', icon: Bird },
  { path: '/pronoia', label: 'Pronoia', icon: Swords },
  { path: '/ergane', label: 'Ergane', icon: Hammer },
] as const;

export function Sidebar() {
  const isOpen = useSidebarOpen();
  const location = useLocation();

  return (
    <aside
      className={`
        ${isOpen ? 'w-60' : 'w-16'}
        bg-athena-surface border-r border-athena-border
        flex flex-col shrink-0
        transition-all duration-200
      `}
    >
      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <li key={path}>
                <Link
                  to={path}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md
                    transition-colors
                    ${isActive
                      ? 'bg-athena-border text-athena-text'
                      : 'text-athena-muted hover:bg-athena-border hover:text-athena-text'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {isOpen && <span>{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Entity list placeholder */}
      {isOpen && (
        <div className="px-4 py-3 border-t border-athena-border">
          <p className="text-sm text-athena-muted">Notes will appear here</p>
        </div>
      )}

      {/* Collapse button */}
      <div className="p-2 border-t border-athena-border">
        <button
          onClick={() => uiActions.toggleSidebar()}
          className={`
            flex items-center gap-3 px-3 py-2 rounded-md w-full
            text-athena-muted hover:bg-athena-border hover:text-athena-text
            transition-colors
          `}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? (
            <>
              <PanelLeftClose className="w-5 h-5 shrink-0" />
              <span>Collapse</span>
            </>
          ) : (
            <PanelLeft className="w-5 h-5 shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}
