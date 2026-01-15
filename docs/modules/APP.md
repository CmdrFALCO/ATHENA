# App Module

**Location:** `src/app/`
**Status:** Implemented in WP 1.1

## Purpose

Application shell providing layout, navigation, routing, and initialization infrastructure.

---

## File Listing

| File | Description |
|------|-------------|
| `index.ts` | Barrel export |
| `layout/index.ts` | Layout component exports |
| `layout/AppLayout.tsx` | Main layout wrapper (Header, Sidebar, content) |
| `layout/Header.tsx` | Top header bar (title, sidebar toggle) |
| `layout/Sidebar.tsx` | Collapsible sidebar (240px/64px) |
| `layout/StoreInitializer.tsx` | Store initialization wrapper |
| `routes/index.tsx` | Router configuration + route tree |
| `routes/SophiaPage.tsx` | Knowledge workspace page |
| `routes/PronoiaPage.tsx` | Planning workspace placeholder |
| `routes/ErganePage.tsx` | Creation workspace placeholder |

---

## Public API

```typescript
// src/app/index.ts
export { AppLayout, Header, Sidebar, StoreInitializer } from './layout';
export { router } from './routes';
```

---

## Layout Components

### AppLayout

Main layout wrapper combining all layout elements.

```typescript
<AppLayout>
  {/* Page content renders here */}
</AppLayout>
```

Structure:
```
┌────────────────────────────────────────┐
│ Header (48px)                          │
├─────────┬──────────────────────────────┤
│ Sidebar │ Content Area                 │
│ (240px  │                              │
│ or 64px)│                              │
│         │                              │
└─────────┴──────────────────────────────┘
```

### Header

Top navigation bar with app branding and controls.

Features:
- App title/logo
- Sidebar toggle button
- Global actions (future)

### Sidebar

Collapsible navigation panel.

States:
- Expanded: 240px width, full labels
- Collapsed: 64px width, icons only

Navigation items:
- Sophia (Bird icon) - Knowledge workspace
- Pronoia (Swords icon) - Planning workspace
- Ergane (Hammer icon) - Creation workspace

### StoreInitializer

Wrapper component ensuring store is loaded before rendering children.

```typescript
function StoreInitializer({ children }) {
  const { isLoading, error } = useInitializeStore();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return children;
}
```

---

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Redirect | Redirects to `/sophia` |
| `/sophia` | SophiaPage | Knowledge workspace (Bird icon) |
| `/pronoia` | PronoiaPage | Planning workspace (Swords icon) |
| `/ergane` | ErganePage | Creation workspace (Hammer icon) |

### Navigation Usage

```typescript
import { Link, useLocation } from '@tanstack/react-router';

// Navigation link with active state
<Link
  to="/sophia"
  className={location.pathname === '/sophia' ? 'active' : ''}
>
  Sophia
</Link>
```

### Sidebar Toggle

```typescript
import { useSidebarOpen, uiActions } from '@/store';

const isOpen = useSidebarOpen();
<button onClick={() => uiActions.toggleSidebar()}>Toggle</button>
```

---

## Entry Points

| File | Purpose |
|------|---------|
| `src/main.tsx` | React app bootstrap |
| `src/App.tsx` | Root component (RouterProvider wrapper) |
| `src/app/routes/index.tsx` | Router configuration + route tree |

---

## Styling

### Color System

Dark theme colors defined in Tailwind:
- `athena-bg` - Main background
- `athena-surface` - Card/panel surfaces
- `athena-border` - Border color
- `athena-text` - Primary text
- `athena-muted` - Secondary/muted text

### Layout Dimensions

| Element | Size |
|---------|------|
| Header height | 48px |
| Sidebar (expanded) | 240px |
| Sidebar (collapsed) | 64px |

### Transitions

All layout transitions use:
```css
transition-all duration-200
```

---

## Theme Constants

**Location:** `src/shared/theme/`

```typescript
import { ATHENA_COLORS } from '@/shared/theme';

// Connection colors
ATHENA_COLORS.connection.explicit  // '#3b82f6' - Blue
ATHENA_COLORS.connection.semantic  // '#22c55e' - Green

// Node colors by entity type
ATHENA_COLORS.node.note     // '#3b82f6' - Blue
ATHENA_COLORS.node.plan     // '#f59e0b' - Amber
ATHENA_COLORS.node.document // '#8b5cf6' - Purple

// Surface colors
ATHENA_COLORS.surface.canvas     // '#1a1a1a'
ATHENA_COLORS.surface.node       // '#252525'
ATHENA_COLORS.surface.nodeBorder // '#3a3a3a'
```

---

## DevSettings Panel

**Location:** `src/config/DevSettingsPanel.tsx`
**Shortcut:** Ctrl+Shift+D

Features:
- Feature flag toggles
- AI configuration (WP 3.1)
- API key management
- Indexer status display (WP 3.3)

---

## Related Documentation

- [Store Module](STORE.md) - State initialization
- [Sophia Module](SOPHIA.md) - Knowledge workspace content
- [Canvas Module](CANVAS.md) - Graph visualization content
