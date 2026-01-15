import { Link, useLocation } from '@tanstack/react-router';
import { Bird, Swords, Hammer, PanelLeftClose, PanelLeft, Plus } from 'lucide-react';
import { useSidebarOpen, useNotes, uiActions, entityActions } from '@/store';
import { useNoteAdapter } from '@/adapters';
import { EntityList } from '@/modules/sophia';

const navItems = [
  { path: '/sophia', label: 'Sophia', icon: Bird },
  { path: '/pronoia', label: 'Pronoia', icon: Swords },
  { path: '/ergane', label: 'Ergane', icon: Hammer },
] as const;

export function Sidebar() {
  const isOpen = useSidebarOpen();
  const location = useLocation();
  const noteAdapter = useNoteAdapter();
  const notes = useNotes();

  const handleCreateNote = async () => {
    // Calculate sensible default position (offset from existing nodes)
    const defaultX = notes.length > 0
      ? Math.max(...notes.map((n) => n.position_x ?? 0)) + 250
      : 100;
    const defaultY = 100;

    const newNote = await noteAdapter.create({
      type: 'note',
      subtype: 'zettelkasten',
      title: 'Untitled Note',
      content: [],
      metadata: {},
      position_x: defaultX,
      position_y: defaultY,
    });
    entityActions.addNote(newNote);
    uiActions.selectEntity(newNote.id);
  };

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
      <nav className="py-4 shrink-0">
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
                      ? 'bg-athena-bg text-white'
                      : 'text-athena-muted hover:text-athena-text hover:bg-athena-bg/50'
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

      {/* Entity list */}
      {isOpen && (
        <div className="flex-1 min-h-0 border-t border-athena-border flex flex-col">
          {/* Notes header with create button */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-medium text-athena-muted uppercase tracking-wider">
              Notes
            </span>
            <button
              onClick={handleCreateNote}
              className="p-1 rounded hover:bg-athena-bg text-athena-muted hover:text-athena-text transition-colors"
              title="New Note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <EntityList />
        </div>
      )}

      {/* Collapse button */}
      <div className="p-2 border-t border-athena-border">
        <button
          onClick={() => uiActions.toggleSidebar()}
          className={`
            flex items-center gap-3 px-3 py-2 rounded-md w-full
            text-athena-muted hover:text-athena-text hover:bg-athena-bg/50
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
