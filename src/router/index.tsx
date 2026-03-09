import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import DashboardPage from '../pages/DashboardPage';
import TeamRosterPage from '../pages/TeamRosterPage';
import ProjectPipelinePage from '../pages/ProjectPipelinePage';
import HiringPipelinePage from '../pages/HiringPipelinePage';
import TMIntelligencePage from '../pages/TMIntelligencePage';
import BenchUtilizationPage from '../pages/BenchUtilizationPage';
import FinancialsPage from '../pages/FinancialsPage';
import SettingsPage from '../pages/SettingsPage';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'team', element: <TeamRosterPage /> },
        { path: 'projects', element: <ProjectPipelinePage /> },
        { path: 'hiring', element: <HiringPipelinePage /> },
        { path: 'tm-intelligence', element: <TMIntelligencePage /> },
        { path: 'bench', element: <BenchUtilizationPage /> },
        { path: 'financials', element: <FinancialsPage /> },
        { path: 'settings', element: <SettingsPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' }
);
