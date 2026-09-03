import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SafetyProvider } from './contexts/SafetyContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import Landing from './pages/Landing';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import EmergencyReport from './pages/EmergencyReport';
import AIAssistant from './pages/AIAssistant';
import EmergencyMap from './pages/EmergencyMap';
import Alerts from './pages/Alerts';
import Community from './pages/Community';
import SafeRoutes from './pages/SafeRoutes';
import EmergencyResources from './pages/EmergencyResources';
import TrustedContacts from './pages/TrustedContacts';
import EmergencyGuide from './pages/EmergencyGuide';
import ProfileSettings from './pages/ProfileSettings';
import Guidance from './pages/Guidance';
import GuidanceDetail from './pages/GuidanceDetail';
import Harassment from './pages/Harassment';
import Onboarding, { isOnboardingComplete } from './pages/Onboarding';

function AppRoutes() {
  const [onboardingDone, setOnboardingDone] = useState(isOnboardingComplete());

  return (
    <>
      {!onboardingDone && (
        <Onboarding onComplete={() => setOnboardingDone(true)} />
      )}
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes — require authentication */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/report" element={<EmergencyReport />} />
          <Route path="/assistant" element={<AIAssistant />} />
          <Route path="/map" element={<EmergencyMap />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/community" element={<Community />} />
          <Route path="/routes" element={<SafeRoutes />} />
          <Route path="/resources" element={<EmergencyResources />} />
          <Route path="/contacts" element={<TrustedContacts />} />
          <Route path="/guide" element={<EmergencyGuide />} />
          <Route path="/guidance" element={<Guidance />} />
          <Route path="/guidance/:categoryId" element={<GuidanceDetail />} />
          <Route path="/harassment" element={<Harassment />} />
          <Route path="/settings" element={<ProfileSettings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <SafetyProvider>
              <AppRoutes />
            </SafetyProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
