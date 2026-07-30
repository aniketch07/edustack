'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building,
  Users,
  BookOpen,
  UserCheck,
  LogOut,
  CheckCircle,
  Plus,
  Search,
  Eye,
  Trash2,
  AlertTriangle,
  RefreshCw,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, UserRole } from '@/types';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [institutes, setInstitutes] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalInstitutes: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalCourses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Delete modal state
  const [selectedInstitute, setSelectedInstitute] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      fetchInstitutesAndMetrics();
    }
  }, [router]);

  const fetchInstitutesAndMetrics = async () => {
    try {
      setRefreshing(true);
      const data = await apiFetch<any>('/institutes');
      if (Array.isArray(data)) {
        setInstitutes(data);
        setMetrics({
          totalInstitutes: data.length,
          totalTeachers: data.reduce((acc, i) => acc + (i.teachersCount || 0), 0),
          totalStudents: data.reduce((acc, i) => acc + (i.studentsCount || 0), 0),
          totalCourses: data.reduce((acc, i) => acc + (i.coursesCount || 0), 0),
        });
      } else if (data && data.institutes) {
        setInstitutes(data.institutes);
        setMetrics({
          totalInstitutes: data.totalInstitutes || data.institutes.length,
          totalTeachers: data.totalTeachers || 0,
          totalStudents: data.totalStudents || 0,
          totalCourses: data.totalCourses || 0,
        });
      }
    } catch (e) {
      console.error('Failed to load institutes and analytics:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedInstitute) return;
    setDeleting(true);

    try {
      await apiFetch(`/institutes/${selectedInstitute.id}`, {
        method: 'DELETE',
      });
      setSelectedInstitute(null);
      fetchInstitutesAndMetrics();
    } catch (err: any) {
      alert(err.message || 'Failed to delete institute');
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  const filteredInstitutes = institutes.filter(
    (i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.slug.toLowerCase().includes(search.toLowerCase()),
  );

  if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center text-xs gap-3">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span>Verifying super admin session...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Header Bar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <span className="font-bold text-base sm:text-lg text-white tracking-tight">EduStack Super Admin</span>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
            Platform Owner Portal
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs sm:text-sm font-semibold text-white">
              {currentUser?.firstName} {currentUser?.lastName}
            </p>
            <p className="text-[11px] text-slate-400">{currentUser?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Page Title & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Platform Analytics & Management
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Real-time multi-tenant metrics across all institutes, faculty staff, students, and courses.
            </p>
          </div>
          <button
            onClick={fetchInstitutesAndMetrics}
            disabled={refreshing}
            className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>

        {/* Analytics Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Institutes</span>
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                <Building className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{metrics.totalInstitutes}</div>
            <div className="text-xs text-emerald-400 mt-2 font-medium flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{metrics.totalInstitutes} Active Workspaces</span>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-teal-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between text-teal-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Faculty Teachers</span>
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{metrics.totalTeachers}</div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Platform-wide faculty staff</div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Enrolled Students</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{metrics.totalStudents}</div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Across all institute tenants</div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between text-purple-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Published Courses</span>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{metrics.totalCourses}</div>
            <div className="text-xs text-purple-400 mt-2 font-semibold">Active learning catalogs</div>
          </div>
        </div>

        {/* Per-Institute Breakdown Table */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Registered Institutes & Tenant Metrics</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Detailed breakdown of faculty, students, and courses per tenant workspace
              </p>
            </div>
            <Link
              href="/admin/institutes/create"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-blue-600/25 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard New Institute</span>
            </Link>
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search institutes by name or slug..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Table Area */}
          <div className="overflow-x-auto rounded-xl border border-slate-800/80">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <span>Loading institutes and tenant metrics...</span>
              </div>
            ) : filteredInstitutes.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/50 space-y-2">
                <Building className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No Institutes Match Your Search</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your search criteria or click "Onboard New Institute" above to create a new workspace.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Institute</th>
                    <th className="py-3.5 px-4">Slug</th>
                    <th className="py-3.5 px-4">Faculty Teachers</th>
                    <th className="py-3.5 px-4">Active Students</th>
                    <th className="py-3.5 px-4">Courses</th>
                    <th className="py-3.5 px-4">Brand Colors</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {filteredInstitutes.map((inst) => {
                    const logo = inst.logoUrl || inst.logo;
                    return (
                      <tr key={inst.id} className="hover:bg-slate-800/50 transition-colors group">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <Link
                            href={`/admin/institutes/${inst.id}`}
                            className="flex items-center gap-3 hover:text-blue-400 transition"
                          >
                            {logo ? (
                              <img
                                src={logo}
                                alt={inst.name}
                                className="w-8 h-8 rounded-lg object-contain bg-slate-950 border border-slate-800 p-0.5 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs shrink-0">
                                {inst.name[0]}
                              </div>
                            )}
                            <span className="font-bold text-slate-100 group-hover:text-blue-400 transition">
                              {inst.name}
                            </span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{inst.slug}</td>
                        <td className="py-3.5 px-4 font-bold text-teal-400">
                          {inst.teachersCount !== undefined ? `${inst.teachersCount} Teachers` : '0 Teachers'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400">
                          {inst.studentsCount !== undefined ? `${inst.studentsCount} Students` : '0 Students'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-purple-400">
                          {inst.coursesCount !== undefined ? `${inst.coursesCount} Courses` : '0 Courses'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full border border-slate-700 shadow-sm"
                              style={{ backgroundColor: inst.primaryColor || '#3B82F6' }}
                              title={`Primary: ${inst.primaryColor || '#3B82F6'}`}
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-slate-700 shadow-sm"
                              style={{ backgroundColor: inst.secondaryColor || '#10B981' }}
                              title={`Secondary: ${inst.secondaryColor || '#10B981'}`}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/institutes/${inst.id}`}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => setSelectedInstitute(inst)}
                              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
                              title="Delete Institute"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {selectedInstitute && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Institute Workspace</h3>
                <p className="text-xs text-slate-400">Permanent data deletion</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <p className="text-xs text-slate-400">Target Institute:</p>
              <p className="text-sm font-bold text-white">{selectedInstitute.name}</p>
              <p className="text-[11px] font-mono text-slate-500">ID: {selectedInstitute.id}</p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              This action will permanently delete <span className="font-semibold text-white">{selectedInstitute.name}</span>, including all faculty accounts, student rosters, courses, attendance, and tests.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedInstitute(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
