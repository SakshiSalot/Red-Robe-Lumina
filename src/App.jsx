import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthService from './services/AuthService';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Hero from './components/Hero';
import About from './components/About';
import Contact from './components/Contact';
import DashboardLayout from './components/dashboard/DashboardLayout';
import RecruiterLogin from './components/RecruiterLogin';
import RecruiterJoin from './components/RecruiterJoin';
import CandidateLogin from './components/candidate/CandidateLogin';
import CandidateJoin from './components/candidate/CandidateJoin';
import CandidateDashboard from './components/candidate/CandidateDashboard';
import JobBrowser from './components/candidate/JobBrowser';
import FeedbackPage from './components/candidate/FeedbackPage';
import AssessmentLayout from './components/assessment/AssessmentLayout';
import ErrorBoundary from './components/ErrorBoundary';
import HowItWorks from './components/HowItWorks';
import PlatformFeatures from './components/PlatformFeatures';

const ParticleBackground = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    <div className="absolute inset-0 bg-[#000000]"></div>
    <div className="absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
    {/* Simple starfield simulation */}
    {[...Array(50)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-white opacity-40 animate-pulse"
        style={{
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          width: `${Math.random() * 3}px`,
          height: `${Math.random() * 3}px`,
          animationDelay: `${Math.random() * 5}s`
        }}
      />
    ))}
  </div>
);

// Views that require an authenticated user of a given role.
const RECRUITER_VIEWS = ['dashboard'];
const CANDIDATE_VIEWS = ['candidate-browse', 'candidate-dashboard', 'candidate-feedback', 'assessment'];

// Derive initial auth state from the persisted JWT/role (survives refresh).
const getInitialAuth = () => {
  const token = AuthService.getToken();
  const role = AuthService.getRole();
  return {
    recruiter: !!token && role === 'RECRUITER',
    candidate: !!token && role === 'CANDIDATE',
  };
};

// Restore the last view, but never land on a protected view without the right auth.
const getInitialView = (auth) => {
  const saved = localStorage.getItem('app_view');
  if (!saved) return 'landing';
  if (RECRUITER_VIEWS.includes(saved) && !auth.recruiter) return 'landing';
  if (CANDIDATE_VIEWS.includes(saved) && !auth.candidate) return 'landing';
  return saved;
};

// A shared test link looks like  <origin>/test/<assessmentId>.
// Returns the assessmentId if the current URL is such a link, else null.
const getDeepLinkTestId = () => {
  const m = window.location.pathname.match(/^\/test\/([^/]+)\/?$/);
  return m ? m[1] : null;
};

function App() {
  // Views: 'landing', 'dashboard' (recruiter), 'recruiter-login', 'recruiter-join', 'candidate-login', 'candidate-join', 'candidate-browse', 'candidate-dashboard', 'candidate-feedback', 'assessment'
  const initialAuth = getInitialAuth();
  const deepLinkTestId = getDeepLinkTestId(); // set if opened via a /test/<id> share link
  const [view, setView] = useState(() => {
    if (deepLinkTestId) return initialAuth.candidate ? 'assessment' : 'candidate-login';
    return getInitialView(initialAuth);
  });
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.recruiter); // Recruiter
  const [isCandidateAuth, setIsCandidateAuth] = useState(initialAuth.candidate); // Candidate
  const [activeAssessmentId, setActiveAssessmentId] = useState(() => deepLinkTestId || localStorage.getItem('active_assessment_id') || null);
  // If a non-candidate opens a test link, remember it and launch the test after they log in.
  const [pendingTestId, setPendingTestId] = useState(deepLinkTestId && !initialAuth.candidate ? deepLinkTestId : null);

  // Strip the /test/<id> path from the URL once handled, so refresh/back behave normally.
  useEffect(() => {
    if (deepLinkTestId) window.history.replaceState({}, '', '/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Navigation history (for the back arrow) ──
  // We record every view change here so any page can return to the previous one.
  const [history, setHistory] = useState([]);
  const isBackRef = useRef(false);   // true while a goBack() is in flight
  const prevViewRef = useRef(view);

  useEffect(() => {
    const prev = prevViewRef.current;
    if (prev !== view) {
      // Don't record the page we just came back to; only forward navigation.
      if (isBackRef.current) isBackRef.current = false;
      else setHistory((h) => [...h, prev]);
      prevViewRef.current = view;
    }
  }, [view]);

  const goBack = () => {
    if (history.length === 0) {
      setView('landing');
      return;
    }
    isBackRef.current = true;
    setView(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  };

  // Persist the current view + active assessment so a browser refresh restores them.
  useEffect(() => {
    localStorage.setItem('app_view', view);
  }, [view]);

  useEffect(() => {
    if (activeAssessmentId) localStorage.setItem('active_assessment_id', activeAssessmentId);
    else localStorage.removeItem('active_assessment_id');
  }, [activeAssessmentId]);

  // Single source of truth for logging out: clears token + persisted view.
  const handleLogout = () => {
    AuthService.logout();
    setIsAuthenticated(false);
    setIsCandidateAuth(false);
    setActiveAssessmentId(null);
    localStorage.removeItem('app_view');
    isBackRef.current = true; // don't record the logout jump in history
    setHistory([]);
    setView('landing');
  };

  // Return a logged-in user to their own area, so visiting the landing page
  // (e.g. by clicking the logo) doesn't trap them into logging out to get back.
  const goToDashboard = () => {
    if (isAuthenticated) setView('dashboard');
    else if (isCandidateAuth) setView('candidate-browse');
  };

  // Page transitions are opacity-only (NO transform). A transform on this
  // wrapper would make any position:fixed children (dashboard menu, FAB,
  // proctor widget) anchor to the wrapper and scroll with the content
  // instead of staying pinned to the viewport.
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, transition: { duration: 0.25, ease: "easeIn" } }
  };

  const handleRecruiterLogin = () => {
    setIsAuthenticated(true);
    setView('dashboard');
  };

  const handleRecruiterJoin = () => {
    setIsAuthenticated(true);
    setView('dashboard');
  };

  // After candidate auth: if they arrived via a test link, drop them straight into it.
  const finishCandidateAuth = () => {
    setIsCandidateAuth(true);
    if (pendingTestId) {
      setActiveAssessmentId(pendingTestId);
      setPendingTestId(null);
      setView('assessment');
    } else {
      setView('candidate-browse');
    }
  };

  const handleCandidateLogin = finishCandidateAuth;
  const handleCandidateJoin = finishCandidateAuth;

  // Helper to wrap content in motion div
  const PageWrapper = ({ children }) => (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full h-full absolute inset-0 overflow-y-auto overflow-x-hidden"
    >
      {children}
    </motion.div>
  );

  return (
    <div className="relative min-h-screen w-full bg-black text-white selection:bg-purple-500/30 overflow-hidden font-sans">
      <ParticleBackground />

      {/* Global navbar — hidden on the recruiter dashboard, which has its own bar */}
      {view !== 'dashboard' && (
        <div className="fixed top-0 left-0 w-full z-50">
          <Navbar
            isLoggedIn={isAuthenticated || isCandidateAuth}
            onLogout={handleLogout}
            onDashboard={goToDashboard}
            dashboardLabel={isAuthenticated ? 'Dashboard' : 'Assessments'}
            showBack={view !== 'landing'}
            onBack={goBack}
            onLogin={(type) => {
              if (type === 'candidate') setView('candidate-login');
              else if (type === 'recruiter') setView('recruiter-login');
              else setView('landing');
            }} onJoin={(type) => {
              if (type === 'candidate') setView('candidate-join');
              else if (type === 'recruiter') setView('recruiter-join');
              else setView('landing');
            }} onNavigate={(page) => setView(page)} />
        </div>
      )}

      {/* Candidate Sub-nav — its own layer just below the navbar (z-40, centered) */}
      {view.startsWith('candidate-') && view !== 'candidate-login' && view !== 'candidate-join' && (
        <div className="fixed top-[4.5rem] md:top-24 left-1/2 -translate-x-1/2 flex space-x-1 sm:space-x-2 bg-white/5 backdrop-blur-md rounded-full p-1 border border-white/10 z-40">
          {['browse', 'dashboard', 'feedback'].map(sub => (
            <button
              key={sub}
              onClick={() => setView(`candidate-${sub}`)}
              className={`text-[11px] sm:text-xs px-3 sm:px-4 py-2 rounded-full transition-all ${view === `candidate-${sub}` ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              {sub.charAt(0).toUpperCase() + sub.slice(1)}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* LANDING PAGE */}
        {view === 'landing' && (
          <PageWrapper key="landing">
            <div className="pt-20"><Hero onGetStarted={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} /></div>
            <HowItWorks />
            <PlatformFeatures />
            <Footer onNavigate={(page) => setView(page)} />
          </PageWrapper>
        )}

        {/* ABOUT PAGE */}
        {view === 'about' && (
          <PageWrapper key="about">
            <About />
            <Footer onNavigate={(page) => setView(page)} />
          </PageWrapper>
        )}

        {/* CONTACT PAGE */}
        {view === 'contact' && (
          <PageWrapper key="contact">
            <Contact />
            <Footer onNavigate={(page) => setView(page)} />
          </PageWrapper>
        )}

        {/* RECRUITER ROUTES */}
        {view === 'recruiter-login' && (
          <PageWrapper key="recruiter-login">
            <RecruiterLogin onLogin={handleRecruiterLogin} onSwitchToJoin={() => setView('recruiter-join')} />
            <Footer onNavigate={(page) => setView(page)} />
          </PageWrapper>
        )}

        {view === 'recruiter-join' && (
          <PageWrapper key="recruiter-join">
            <RecruiterJoin onJoin={handleRecruiterJoin} onSwitchToLogin={() => setView('recruiter-login')} />
            <Footer onNavigate={(page) => setView(page)} />
          </PageWrapper>
        )}

        {view === 'dashboard' && (
          <PageWrapper key="recruiter-dashboard">
            <ErrorBoundary>
              <DashboardLayout onLogout={handleLogout} />
            </ErrorBoundary>
            <Footer onNavigate={(page) => setView(page)} />
          </PageWrapper>
        )}

        {/* CANDIDATE ROUTES */}
        {view === 'candidate-login' && (
          <PageWrapper key="candidate-login">
            <CandidateLogin onLogin={handleCandidateLogin} onSwitchToJoin={() => setView('candidate-join')} />
            <Footer onNavigate={(page) => setView(page)} />
          </PageWrapper>
        )}

        {view === 'candidate-join' && (
          <PageWrapper key="candidate-join">
            <CandidateJoin onJoin={handleCandidateJoin} onSwitchToLogin={() => setView('candidate-login')} />
            <Footer onNavigate={(page) => setView(page)} />
          </PageWrapper>
        )}

        {view === 'candidate-browse' && (
          <PageWrapper key="candidate-browse">
            <JobBrowser onApply={(id) => {
              setActiveAssessmentId(id);
              setView('assessment');
            }} />
            <Footer onNavigate={(page) => setView(page)} />
          </PageWrapper>
        )}

        {view === 'candidate-dashboard' && (
          <PageWrapper key="candidate-dashboard">
            <CandidateDashboard onLogout={handleLogout} />
            <Footer onNavigate={(page) => setView(page)} />
          </PageWrapper>
        )}

        {view === 'candidate-feedback' && (
          <PageWrapper key="candidate-feedback">
            <FeedbackPage />
            <Footer onNavigate={(page) => setView(page)} />
          </PageWrapper>
        )}

        {/* ASSESSMENT ARENA ROUTE */}
        {view === 'assessment' && (
          <PageWrapper key="assessment">
            <AssessmentLayout assessmentId={activeAssessmentId} />
            <Footer onNavigate={(page) => setView(page)} />
          </PageWrapper>
        )}


      </AnimatePresence>
    </div>
  );
}

export default App;
