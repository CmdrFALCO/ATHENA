import {
  createRouter,
  createRootRoute,
  createRoute,
  Navigate,
} from '@tanstack/react-router';
import { AppLayout } from '../layout';
import { SophiaPage } from './SophiaPage';
import { PronoiaPage } from './PronoiaPage';
import { ErganePage } from './ErganePage';

// Root route wraps the layout
const rootRoute = createRootRoute({
  component: AppLayout,
});

// Index route redirects to /sophia
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to="/sophia" />,
});

// Sophia route
const sophiaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sophia',
  component: SophiaPage,
});

// Pronoia route
const pronoiaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pronoia',
  component: PronoiaPage,
});

// Ergane route
const erganeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ergane',
  component: ErganePage,
});

// Build route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  sophiaRoute,
  pronoiaRoute,
  erganeRoute,
]);

// Create router
export const router = createRouter({ routeTree });

// Type registration for TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
