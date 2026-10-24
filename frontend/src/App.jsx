import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import { useAuth } from './context/AuthContext.jsx';

// Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BrowseDonations from './pages/BrowseDonations.jsx';
import CreateEditDonation from './pages/CreateEditDonation.jsx';
import DonationDetail from './pages/DonationDetail.jsx';
import BrowseRequests from './pages/BrowseRequests.jsx';
import CreateEditRequest from './pages/CreateEditRequest.jsx';
import RecommendedMatches from './pages/RecommendedMatches.jsx';
import ReservationDetail from './pages/ReservationDetail.jsx';
import MyDonations from './pages/MyDonations.jsx';
import MyRequests from './pages/MyRequests.jsx';
import Notifications from './pages/Notifications.jsx';
import ImpactPage from './pages/ImpactPage.jsx';
import ProfileSettings from './pages/ProfileSettings.jsx';

/**
 * Route protection wrapper.
 * Strictly prevents unauthenticated visitors from accessing private or application content.
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Authenticating secure session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/**
 * Public auth route wrapper.
 * If user is already authenticated, immediately redirects them to their functional dashboard.
 */
function PublicAuthRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading FoodBridge AI...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <>
      <OfflineBanner />
      <Navbar />
      <main id="main-content" className="main-content">
        <Routes>
          {/* Root Route: strictly redirects to Dashboard if logged in, or Login if logged out */}
          <Route
            path="/"
            element={
              loading ? (
                <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading FoodBridge AI...
                </div>
              ) : user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Authentication Routes (Section 3) */}
          <Route
            path="/login"
            element={
              <PublicAuthRoute>
                <Login />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicAuthRoute>
                <Register />
              </PublicAuthRoute>
            }
          />

          {/* Protected Routes (Section 4) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donations"
            element={
              <ProtectedRoute>
                <BrowseDonations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donations/create"
            element={
              <ProtectedRoute>
                <CreateEditDonation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donations/:id"
            element={
              <ProtectedRoute>
                <DonationDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donations/:id/edit"
            element={
              <ProtectedRoute>
                <CreateEditDonation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <BrowseRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests/create"
            element={
              <ProtectedRoute>
                <CreateEditRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests/:id/edit"
            element={
              <ProtectedRoute>
                <CreateEditRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches/request/:id"
            element={
              <ProtectedRoute>
                <RecommendedMatches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reservations/:id"
            element={
              <ProtectedRoute>
                <ReservationDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-donations"
            element={
              <ProtectedRoute>
                <MyDonations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-requests"
            element={
              <ProtectedRoute>
                <MyRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/impact"
            element={
              <ProtectedRoute>
                <ImpactPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
