import type { FC } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';
import DevRoleSwitcher from '@/dev/DevRoleSwitcher';

const App: FC = () => {
  return (
    <ErrorBoundary>
      <AppRoutes />
      {/*
        Dev-only role switcher.

        Gated here at the JSX site, not just inside the component: Vite replaces
        `import.meta.env.DEV` with the literal `false`, Rollup drops the branch, and
        `DevRoleSwitcher` is then referenced by nothing and disappears from the
        bundle along with `devSessions.ts`. Guarding only inside the component
        leaves its module reachable, and stubs of it survive into production.
        Verified by grepping dist/ — see src/dev/devSessions.ts.
      */}
      {import.meta.env.DEV && <DevRoleSwitcher />}
    </ErrorBoundary>
  );
};

export default App;
