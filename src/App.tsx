import { BrowserRouter, Link, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './auth/guards';
import { AccountMark } from './components/Brand';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { TooltipLayer } from './components/TooltipLayer';
import { AddressesPage } from './pages/AddressesPage';
import { AuthPage } from './pages/AuthPage';
import { ContinuePage, HandoffPage, SignOutPage } from './pages/Continue';
import { DeletePage } from './pages/DeletePage';
import { GoPage } from './pages/GoPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OverviewPage } from './pages/OverviewPage';
import { PeoplePage } from './pages/PeoplePage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ProfilePage } from './pages/ProfilePage';
import { SecurityPage } from './pages/SecurityPage';
import { Shell } from './shell/Shell';
import { ThemeProvider } from './theme/ThemeProvider';
import { WhatsNew } from './whatsnew/WhatsNew';
import { useAuth } from './auth/AuthProvider';
import { Navigate, useSearchParams } from 'react-router';
import { FullPageLoader } from './components/Loader';
import { safeLocalPath } from './auth/guards';

function Page({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  );
}

/** Sign-in pages: already signed in, go on (back to the app that asked, or the overview). */
function SignedOutOnly({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [params] = useSearchParams();
  if (status === 'loading') return <FullPageLoader label="Opening your account" />;
  if (status === 'signed-in') {
    const to = params.get('to');
    if (to) return <Navigate to={`/continue?${params.toString()}`} replace />;
    return <Navigate to={safeLocalPath(params.get('next'))} replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <Routes>
                <Route path="/signin" element={<SignedOutOnly><AuthPage mode="signin" /></SignedOutOnly>} />
                <Route path="/signup" element={<SignedOutOnly><AuthPage mode="signup" /></SignedOutOnly>} />
                <Route path="/continue" element={<ContinuePage />} />
                <Route path="/auth/handoff" element={<HandoffPage />} />
                <Route path="/signout" element={<SignOutPage />} />
                <Route path="/go/:app" element={<RequireAuth><GoPage /></RequireAuth>} />
                <Route path="/" element={<Page><OverviewPage /></Page>} />
                <Route path="/profile" element={<Page><ProfilePage /></Page>} />
                <Route path="/people" element={<Page><PeoplePage /></Page>} />
                <Route path="/privacy" element={<Page><PrivacyPage /></Page>} />
                <Route path="/addresses" element={<Page><AddressesPage /></Page>} />
                <Route path="/security" element={<Page><SecurityPage /></Page>} />
                <Route path="/notifications" element={<Page><NotificationsPage /></Page>} />
                <Route path="/delete" element={<Page><DeletePage /></Page>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
          <TooltipLayer />
          <WhatsNew />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function NotFound() {
  return (
    <div className="empty-state" style={{ minHeight: '100%', justifyContent: 'center' }}>
      <AccountMark size={72} />
      <h2>We could not find that page</h2>
      <p>The link may be wrong, or the page may have moved.</p>
      <Link to="/" className="elum-btn elum-btn--primary">
        Go to your account
      </Link>
    </div>
  );
}
