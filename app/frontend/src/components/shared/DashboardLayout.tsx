import { Link, useLocation, Outlet } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  FileText,
  BarChart3,
  Bell,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  Briefcase,
  UserCog,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DashboardLayoutProps {
  role: 'organiser' | 'admin';
}

export default function DashboardLayout({ role }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const organiserLinks: NavItem[] = [
    { to: '/organiser', label: 'Overview', icon: LayoutDashboard },
    { to: '/organiser/services', label: 'Services', icon: Briefcase },
    { to: '/organiser/resources', label: 'Resources', icon: Users },
    { to: '/organiser/bookings', label: 'Bookings', icon: FileText },
    { to: '/organiser/calendar', label: 'Calendar', icon: Calendar },
    { to: '/organiser/settings', label: 'Settings', icon: Settings },
  ];

  const adminLinks: NavItem[] = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/organisers', label: 'Organisers', icon: UserCog },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  ];

  const links = role === 'organiser' ? organiserLinks : adminLinks;
  const title = role === 'organiser' ? 'Organiser' : 'Admin';
  const accentFrom = role === 'organiser' ? 'from-indigo-500' : 'from-violet-500';
  const accentTo = role === 'organiser' ? 'to-violet-500' : 'to-fuchsia-500';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-800">
            <Link to="/" className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accentFrom} ${accentTo} flex items-center justify-center shadow-lg`}>
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Booksy</div>
                <div className="text-[10px] text-slate-500 -mt-1">{title} Panel</div>
              </div>
            </Link>
            <button
              className="lg:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {links.map((link) => {
              const Icon = link.icon;
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? `bg-gradient-to-r ${accentFrom} ${accentTo} text-white shadow-md`
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <Link to="/">
              <Button variant="ghost" className="w-full justify-start gap-3 text-slate-600 dark:text-slate-300">
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
          <div className="h-full flex items-center justify-between px-4 sm:px-6">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1 lg:flex-initial">
              <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 hidden sm:block">
                {title} Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {role === 'admin' ? 'Admin User' : 'Sarah Johnson'}
                  </div>
                  <div className="text-xs text-slate-500">{role === 'admin' ? 'Administrator' : 'Organiser'}</div>
                </div>
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${accentFrom} ${accentTo} flex items-center justify-center text-white text-sm font-semibold shadow-md`}>
                  {role === 'admin' ? 'AU' : 'SJ'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}