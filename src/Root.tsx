import { Suspense, lazy } from 'react';
import App from './App.tsx';

// E1: the guardians' area (/encarregado) is its own small page: it never opens the club's app nor its data
const GuardianApp = lazy(() => import('./guardian/GuardianApp'));

export function Root() {
  if (window.location.pathname.startsWith('/encarregado'))
    return (
      <Suspense fallback={null}>
        <GuardianApp />
      </Suspense>
    );
  return <App />;
}
