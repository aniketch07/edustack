'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building,
  Users,
  BookOpen,
  UserCheck,
  Plus,
  Search,
  Eye,
  Trash2,
  AlertTriangle,
  RefreshCw,
  X,
  Loader2,
  ChevronRight,
  Download,
  ArrowLeft,
  Mail,
  CheckCircle,
} from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, UserRole } from '@/types';

function SeatUsageCell({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const remaining = Math.max(0, limit - used);
  const full = used >= limit;

  const barColor = full
    ? 'bg-red-500'
    : pct >= 90
    ? 'bg-orange-500'
    : pct >= 80
    ? 'bg-amber-400'
    : 'bg-emerald-500';

  const textColor = full
    ? 'text-red-400'
    : pct >= 90
    ? 'text-orange-400'
    : pct >= 80
    ? 'text-amber-300'
    : 'text-emerald-400';

  return (
    <div className="mt-1.5 min-w-[120px]">
      <div className="flex items-center justify-between text-[11px]">
        <span className={`font-bold ${textColor}`}>
          {used} / {limit} Seats
        </span>
        <span className="text-slate-400 font-medium">{remaining} left</span>
      </div>
      <div className="w-full bg-slate-950 rounded-full h-1.5 mt-1 overflow-hidden border border-slate-800">
        <div className={`${barColor} h-full rounded-full transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      {full && (
        <p className="text-[9px] text-red-400 font-bold mt-0.5">● Full — needs upgrade</p>
      )}
    </div>
  );
}

export default function InstitutesManagementModulePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [institutes, setInstitutes] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ totalInstitutes: 0, totalTeachers: 0, totalStudents: 0, totalCourses: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Delete modal state
  const [selectedInstitute, setSelectedInstitute] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else if (user.role !== UserRole.SUPER_ADMIN) {
      router.push('/login');
    } else {
      setCurrentUser(user);
      fetchInstitutesData();
    }
  }, [router]);

  const fetchInstitutesData = async () => {
    try {
      setRefreshing(true);
      const data = await apiFetch<any>('/institutes');
      let instList: any[] = [];
      if (Array.isArray(data)) {
        instList = data;
      } else if (data && data.institutes) {
        instList = data.institutes;
      }
      setInstitutes(instList);
      setMetrics({
        totalInstitutes: instList.length,
        totalTeachers: instList.reduce((acc, i) => acc + (i.teachersCount || 0), 0),
        totalStudents: instList.reduce((acc, i) => acc + (i.studentsCount || 0), 0),
        totalCourses: instList.reduce((acc, i) => acc + (i.coursesCount || 0), 0),
      });
    } catch (e) {
      console.error('Failed to load institutes:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleStatus = async (inst: any) => {
    const nextState = inst.isActive === false ? true : false;
    try {
      await apiFetch(`/institutes/${inst.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextState }),
      });
      setInstitutes((prev) =>
        prev.map((item) => (item.id === inst.id ? { ...item, isActive: nextState } : item)),
      );
    } catch (e) {
      console.error('Failed to update status:', e);
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
      fetchInstitutesData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete institute');
    } finally {
      setDeleting(false);
    }
  };

  const filteredInstitutes = institutes.filter(
    (i) =>
      (i?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (i?.slug || '').toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredInstitutes.length / itemsPerPage) || 1;
  const paginatedInstitutes = filteredInstitutes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToCSV = () => {
    const headers = ['ID', 'Institute Name', 'Slug', 'Contact Email', 'Teachers', 'Students', 'Courses'];
    const rows = filteredInstitutes.map((i) => [
      i.id,
      i.name,
      i.slug,
      i.contactEmail,
      i.teachersCount || 0,
      i.studentsCount || 0,
      i.coursesCount || 0,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `institutes_workspaces_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      {/* Header & Breadcrumb */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
              <Link href="/admin" className="hover:text-white transition">
                Dashboard
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-blue-400 font-semibold">Institutes</span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Institutes Workspaces Management</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInstitutesData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <Link
            href="/admin/institutes/create"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard New Institute</span>
          </Link>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="p-6 max-w-7xl w-full mx-auto space-y-6 flex-1">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Workspaces</span>
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Building className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{metrics.totalInstitutes}</div>
            <p className="text-xs text-slate-400 mt-2">Active tenant workspaces</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-teal-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Faculty Staff</span>
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{metrics.totalTeachers}</div>
            <p className="text-xs text-slate-400 mt-2">Total registered teachers</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Enrolled Students</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{metrics.totalStudents}</div>
            <p className="text-xs text-slate-400 mt-2">Total enrolled students</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-purple-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Courses Published</span>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{metrics.totalCourses}</div>
            <p className="text-xs text-slate-400 mt-2">Published learning catalogs</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search institutes by name or slug..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
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
        </div>

        {/* Data Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="overflow-x-auto rounded-xl border border-slate-800/80">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <span>Loading institutes workspaces...</span>
              </div>
            ) : paginatedInstitutes.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/50 space-y-2">
                <Building className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No Institutes Found</p>
                <p className="text-xs text-slate-500">Try adjusting your search criteria or click "Onboard New Institute".</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Institute</th>
                    <th className="py-3.5 px-4">Slug</th>
                    <th className="py-3.5 px-4">Workspace Status</th>
                    <th className="py-3.5 px-4">Plan & Seats</th>
                    <th className="py-3.5 px-4">Faculty Teachers</th>
                    <th className="py-3.5 px-4">Active Students</th>
                    <th className="py-3.5 px-4">Courses</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {paginatedInstitutes.map((inst) => {
                    const logo = inst.logoUrl || inst.logo;
                    const isActive = inst.isActive !== false;
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
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleStatus(inst)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                            }`}
                          >
                            {isActive ? '● ACTIVE' : '○ SUSPENDED'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                              {inst.planName || 'Starter'}
                            </span>
                            {inst.subscriptionStatus && inst.subscriptionStatus !== 'ACTIVE' && (
                              <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold">
                                {inst.subscriptionStatus}
                              </span>
                            )}
                          </div>
                          {inst.studentLimit === null || inst.studentLimit === undefined ? (
                            <p className="mt-1.5 text-[11px] font-bold text-emerald-400">
                              {inst.activeStudentsCount ?? inst.studentsCount ?? 0} / ∞ Seats Used
                            </p>
                          ) : (
                            <SeatUsageCell
                              used={inst.activeStudentsCount ?? inst.studentsCount ?? 0}
                              limit={inst.studentLimit}
                            />
                          )}
                        </td>
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

          {/* Pagination Controls */}
          {filteredInstitutes.length > 0 && (
            <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
              <span>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredInstitutes.length)} of {filteredInstitutes.length} institutes
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition cursor-pointer"
                >
                  Previous
                </button>
                <span className="font-mono text-white">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

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
