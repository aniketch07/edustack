'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Users,
  UserCheck,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Menu,
  X,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { User, UserRole } from '@/types';

export default function InstituteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else {
      setCurrentUser(user);
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center text-xs gap-3">
        <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
        <span>Loading workspace navigation...</span>
      </div>
    );
  }

  // If user is not an Institute Admin (e.g. Teacher or Student visiting course page), render children cleanly
  if (currentUser?.role !== UserRole.INSTITUTE_ADMIN) {
    return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
  }

  const isCurrent = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(path);
  };

  const instituteName = currentUser?.institute?.name || 'Institute Workspace';
  const logoUrl = currentUser?.institute?.logoUrl;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-teal-500 selection:text-white">
      {/* Persistent Desktop Left Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900/90 border-r border-slate-800/80 sticky top-0 h-screen shrink-0 z-40">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={instituteName}
              className="w-10 h-10 rounded-xl object-contain bg-slate-950 border border-slate-800 shrink-0 p-1"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-blue-500 p-0.5 flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-teal-400" />
              </div>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-extrabold text-sm text-white tracking-tight truncate">{instituteName}</h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Institute Admin</p>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <Link
            href="/dashboard"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCurrent('/dashboard')
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Academy Overview</span>
          </Link>

          <Link
            href="/courses"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCurrent('/courses')
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Courses & Curricula</span>
          </Link>

          <Link
            href="/teachers"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCurrent('/teachers')
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Faculty Staff</span>
          </Link>

          <Link
            href="/students"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCurrent('/students')
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Enrolled Students</span>
          </Link>
        </nav>

        {/* User Profile & Sign Out */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
          <div className="truncate">
            <p className="text-xs font-bold text-white truncate">
              {currentUser?.firstName} {currentUser?.lastName}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Navigation Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-xl bg-slate-800 text-slate-200">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-bold text-sm text-white truncate max-w-[200px]">{instituteName}</span>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-30 pt-16 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold ${
                pathname === '/dashboard' ? 'bg-teal-600 text-white' : 'text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Academy Overview</span>
            </Link>

            <Link
              href="/courses"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold ${
                pathname.startsWith('/courses') ? 'bg-teal-600 text-white' : 'text-slate-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Courses & Curricula</span>
            </Link>

            <Link
              href="/teachers"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold ${
                pathname.startsWith('/teachers') ? 'bg-teal-600 text-white' : 'text-slate-300'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Faculty Staff</span>
            </Link>

            <Link
              href="/students"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold ${
                pathname.startsWith('/students') ? 'bg-teal-600 text-white' : 'text-slate-300'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Enrolled Students</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content View */}
      <div className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
