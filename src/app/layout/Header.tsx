import { Menu, Search, Settings } from 'lucide-react';
import { useSelector } from '@legendapp/state/react';
import { uiActions } from '@/store';
import { devSettings$ } from '@/config/devSettings';
import { AXIOMIndicator } from '@/modules/axiom/components';

interface HeaderProps {
  onSearchClick?: () => void;
}

export function Header({ onSearchClick }: HeaderProps) {
  const showAXIOMIndicator = useSelector(() => devSettings$.axiom.visualization.showIndicator.get());

  return (
    <header className="h-12 bg-athena-surface border-b border-athena-border flex items-center px-4 shrink-0">
      <button
        onClick={() => uiActions.toggleSidebar()}
        className="p-2 hover:bg-athena-border rounded-md transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5 text-athena-text" />
      </button>

      <h1 className="text-lg font-semibold text-athena-text ml-4">ΛTHENΛ</h1>

      <div className="flex-1" />

      {/* AXIOM status indicator (WP 9A.3) */}
      {showAXIOMIndicator && <AXIOMIndicator className="mr-2" />}

      <div className="flex items-center gap-2">
        <button
          onClick={onSearchClick}
          className="p-2 text-athena-text hover:bg-athena-border rounded-md transition-colors"
          aria-label="Search (Cmd+Shift+K)"
          title="Search (Cmd+Shift+K)"
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          disabled
          className="p-2 text-athena-muted cursor-not-allowed opacity-50 rounded-md"
          aria-label="Settings (coming soon)"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
