import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import PageLoader from './components/PageLoader';
import ScrollToTop from './components/ScrollToTop';

// Lazy load all pages for better performance and to show the loader during transitions
const Home = lazy(() => import('./pages/Home'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const OfficialLogin = lazy(() => import('./pages/OfficialLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));
const VerifyStudent = lazy(() => import('./pages/VerifyStudent'));
const BusPassDisplay = lazy(() => import('./pages/BusPassDisplay'));
const VerifyPass = lazy(() => import('./pages/VerifyPass'));
const CancellationDashboard = lazy(() => import('./pages/CancellationDashboard'));
const StudentApplicationForm = lazy(() => import('./pages/StudentApplicationForm'));

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="app-container">
        <Navbar />
        <main className="content-area">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/apply" element={<StudentApplicationForm />} />
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/admin" element={<OfficialLogin />} />
              <Route path="/admin/login" element={<OfficialLogin />} />
              <Route path="/hod" element={<OfficialLogin />} />
              <Route path="/principal" element={<OfficialLogin />} />
              <Route path="/cancellation/dashboard" element={<CancellationDashboard />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />

              <Route path="/verify/:regNo" element={<VerifyStudent />} />
              <Route path="/verify-pass/:regNo" element={<VerifyPass />} />
              <Route path="/pass/:regNo" element={<BusPassDisplay />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}

export default App;
