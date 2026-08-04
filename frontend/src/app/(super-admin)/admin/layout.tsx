'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Building,
  Users,
  BookOpen,
  UserCheck,
  ShieldCheck,
  LogOut,
  Sparkles,
  LayoutDashboard,
  Activity,
  Settings,
  Menu,
  X,
  Loader2,
} from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, UserRole } from '@/types';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [instituteCount, setInstituteCount] = useState(0);

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else if (user.role !== UserRole.SUPER_ADMIN) {
      if (user.role === UserRole.INSTITUTE_ADMIN) {
        router.push('/dashboard');
      } else if (user.role === UserRole.TEACHER) {
        router.push('/teacher/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } else {
      setCurrentUser(user);
      apiFetch<any>('/institutes')
        .then((data) => {
          if (Array.isArray(data)) setInstituteCount(data.length);
          else if (data?.institutes) setInstituteCount(data.institutes.length);
        })
        .catch(() => {});
    }
  }, [router]);

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center text-xs gap-3">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span>Verifying super admin session...</span>
      </div>
    );
  }

  const isCurrent = (path: string) => {
    if (path === '/admin') return pathname === '/admin';
    return pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-blue-500 selection:text-white">
      {/* Persistent Desktop Left Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900/90 border-r border-slate-800/80 sticky top-0 h-screen shrink-0 z-40">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-tight">EduStack Control</h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Super Admin Console</p>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <Link
            href="/admin"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCurrent('/admin') && pathname === '/admin'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview Analytics</span>
          </Link>

          <Link
            href="/admin/institutes"
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCurrent('/admin/institutes')
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Building className="w-4 h-4" />
              <span>Institutes</span>
            </div>
            {instituteCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold border border-slate-700">
                {instituteCount}
              </span>
            )}
          </Link>

          <Link
            href="/admin/admins"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCurrent('/admin/admins')
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Institute Admins</span>
          </Link>

          <Link
            href="/admin/teachers"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCurrent('/admin/teachers')
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Faculty Staff</span>
          </Link>

          <Link
            href="/admin/students"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCurrent('/admin/students')
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Enrolled Students</span>
          </Link>

          <Link
            href="/admin/courses"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCurrent('/admin/courses')
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Published Courses</span>
          </Link>

          <Link
            href="/admin/activity"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCurrent('/admin/activity')
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Activity Feed</span>
          </Link>

          <Link
            href="/admin/settings"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCurrent('/admin/settings')
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Platform Settings</span>
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
          <span className="font-bold text-sm text-white">EduStack Super Admin</span>
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
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold ${
                pathname === '/admin' ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview Analytics</span>
            </Link>
            <Link
              href="/admin/institutes"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold ${
                pathname.startsWith('/admin/institutes') ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Institutes</span>
            </Link>
            <Link
              href="/admin/admins"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold ${
                pathname.startsWith('/admin/admins') ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Institute Admins</span>
            </Link>
            <Link
              href="/admin/teachers"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold ${
                pathname.startsWith('/admin/teachers') ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Faculty Staff</span>
            </Link>
            <Link
              href="/admin/students"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold ${
                pathname.startsWith('/admin/students') ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Enrolled Students</span>
            </Link>
            <Link
              href="/admin/courses"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold ${
                pathname.startsWith('/admin/courses') ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Published Courses</span>
            </Link>
            <Link
              href="/admin/activity"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold ${
                pathname.startsWith('/admin/activity') ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Activity Feed</span>
            </Link>
            <Link
              href="/admin/settings"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold ${
                pathname.startsWith('/admin/settings') ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Platform Settings</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content View (Children) */}
      <div className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
