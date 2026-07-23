import type { FC } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';

const App: FC = () => {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
};

export default App;
