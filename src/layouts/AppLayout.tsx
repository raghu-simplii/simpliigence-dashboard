import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 p-8 bg-surface min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
