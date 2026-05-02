import { Link, useLocation } from 'react-router-dom';
import { Calendar, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthContext';
import { toast } from 'sonner';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  const links = [
    { to: '/customer/home', label: 'Home' },
    { to: '/book', label: 'Book Now' },
    { to: '/profile', label: 'My Profile' },
    { to: '/organiser/dashboard', label: 'Organiser' },
    { to: '/admin/dashboard', label: 'Admin' },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/60 dark:border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Booksy
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(l.to)
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden md:block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {user.name}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="hidden md:flex gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden md:block">
                  <Button variant="outline" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link to="/signup" className="hidden md:block">
                  <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white">
                    Sign up
                  </Button>
                </Link>
              </>
            )}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setOpen(!open)}
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden py-3 space-y-1 border-t border-slate-200 dark:border-slate-800">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {l.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2 px-4">
              {user ? (
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    handleLogout();
                    setOpen(false);
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              ) : (
                <>
                  <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">Log in</Button>
                  </Link>
                  <Link to="/signup" className="flex-1" onClick={() => setOpen(false)}>
                    <Button size="sm" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white">Sign up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}