import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './LandingPage';
import { PlannerPage } from './PlannerPage';
import { BudgetPage } from './BudgetPage';
import { VoiceAssistantPage } from './VoiceAssistantPage';
import { ProfilePage } from './ProfilePage';

export const AppRoutes = (): JSX.Element => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/planner" element={<PlannerPage />} />
    <Route path="/budget" element={<BudgetPage />} />
    <Route path="/voice" element={<VoiceAssistantPage />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
