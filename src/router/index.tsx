import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import DashboardPage from '../pages/DashboardPage';
import TeamRosterPage from '../pages/TeamRosterPage';
import ProjectPipelinePage from '../pages/ProjectPipelinePage';
import PipelinePage from '../pages/PipelinePage';
import ForecastingPage from '../pages/ForecastingPage';
import FinancialsPage from '../pages/FinancialsPage';
import SettingsPage from '../pages/SettingsPage';
import HiringForecastPage from '../pages/HiringForecastPage';
import ConciergePage from '../pages/ConciergePage';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'team', element: <TeamRosterPage /> },
        { path: 'projects', element: <ProjectPipelinePage /> },
        { path: 'pipeline', element: <PipelinePage /> },
        { path: 'forecasting', element: <ForecastingPage /> },
        { path: 'hiring-forecast', element: <HiringForecastPage /> },
        { path: 'financials', element: <FinancialsPage /> },
        { path: 'concierge', element: <ConciergePage /> },
        { path: 'settings', element: <SettingsPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
);
