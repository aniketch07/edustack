'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building, Users, BookOpen, UserCheck, LogOut, CheckCircle, Plus, Search, Eye, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, Institute, UserRole } from '@/types';

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
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-xs">
        Checking permissions...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg text-white">EduStack Super Admin</span>
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
            Platform Owner Portal
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white">{currentUser?.firstName} {currentUser?.lastName}</p>
            <p className="text-xs text-slate-400">{currentUser?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Analytics & Management</h1>
          <p className="text-slate-400 text-sm mt-1">Platform-wide overview of institutes, faculty teachers, enrolled students, and course catalog metrics.</p>
        </div>

        {/* Analytics Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Institutes</span>
              <Building className="w-5 h-5" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">{metrics.totalInstitutes}</div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {metrics.totalInstitutes} Active Workspaces
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-teal-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Faculty Teachers</span>
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">{metrics.totalTeachers}</div>
            <div className="text-xs text-slate-400 mt-1">Platform-wide faculty staff</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Enrolled Students</span>
              <Users className="w-5 h-5" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">{metrics.totalStudents}</div>
            <div className="text-xs text-slate-400 mt-1">Across all institute tenants</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-purple-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Published Courses</span>
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">{metrics.totalCourses}</div>
            <div className="text-xs text-purple-400 mt-1 font-semibold">Active learning catalogs</div>
          </div>
        </div>

        {/* Per-Institute Breakdown Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Registered Institutes & Tenant Metrics</h2>
              <p className="text-xs text-slate-400">Breakdown of teachers, students, and courses per institute</p>
            </div>
            <Link
              href="/admin/institutes/create"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Onboard New Institute
            </Link>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search institutes by name or slug..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading institutes & analytics...</div>
            ) : filteredInstitutes.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/50">
                <Building className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No Institutes Found</p>
                <p className="text-xs text-slate-500 mt-1">Click "Onboard New Institute" above to create the first institute and admin account.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Institute</th>
                    <th className="py-3 px-4">Slug</th>
                    <th className="py-3 px-4">Faculty Teachers</th>
                    <th className="py-3 px-4">Active Students</th>
                    <th className="py-3 px-4">Courses</th>
                    <th className="py-3 px-4">Accents</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredInstitutes.map((inst) => {
                    const logo = inst.logoUrl || inst.logo;
                    return (
                      <tr key={inst.id} className="hover:bg-slate-950/50">
                        <td className="py-3 px-4 font-semibold text-white">
                          <Link href={`/admin/institutes/${inst.id}`} className="flex items-center gap-3 hover:text-blue-400 transition">
                            {logo ? (
                              <img src={logo} alt={inst.name} className="w-7 h-7 rounded-lg object-contain bg-slate-950 border border-slate-800 p-0.5" />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">
                                {inst.name[0]}
                              </div>
                            )}
                            <span>{inst.name}</span>
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{inst.slug}</td>
                        <td className="py-3 px-4 font-bold text-teal-400">
                          {inst.teachersCount !== undefined ? `${inst.teachersCount} Teachers` : '0 Teachers'}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400">
                          {inst.studentsCount !== undefined ? `${inst.studentsCount} Students` : '0 Students'}
                        </td>
                        <td className="py-3 px-4 font-bold text-purple-400">
                          {inst.coursesCount !== undefined ? `${inst.coursesCount} Courses` : '0 Courses'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded-full border border-slate-700" style={{ backgroundColor: inst.primaryColor || '#3B82F6' }} />
                            <span className="w-3.5 h-3.5 rounded-full border border-slate-700" style={{ backgroundColor: inst.secondaryColor || '#10B981' }} />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/institutes/${inst.id}`}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => setSelectedInstitute(inst)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Institute</h3>
                <p className="text-xs text-slate-400">Confirm permanent deletion</p>
              </div>
            </div>

            <p className="text-sm text-slate-200 font-semibold bg-slate-950 p-4 rounded-xl border border-slate-800">
              Are you sure you want to remove this institute?
            </p>

            <p className="text-xs text-slate-400 leading-relaxed">
              This action will permanently delete <span className="font-semibold text-white">{selectedInstitute.name}</span> and all associated user accounts.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedInstitute(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {deleting ? 'Removing...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
