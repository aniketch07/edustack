'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserCheck,
  Building,
  Search,
  RefreshCw,
  Loader2,
  ChevronRight,
  ChevronDown,
  Download,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  KeyRound,
  BookOpen,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, UserRole } from '@/types';
import ResetPasswordModal from '@/components/ResetPasswordModal';

export default function FacultyStaffManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [groupedFaculty, setGroupedFaculty] = useState<any[]>([]);
  const [institutes, setInstitutes] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ totalTeachers: 0, totalInstitutes: 0, totalCourses: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedInstituteFilter, setSelectedInstituteFilter] = useState('ALL');

  // Accordion open/close state per institute
  const [openInstitutes, setOpenInstitutes] = useState<Record<string, boolean>>({});

  // Password reset modal state
  const [resetUser, setResetUser] = useState<any | null>(null);

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else if (user.role !== UserRole.SUPER_ADMIN) {
      router.push('/login');
    } else {
      setCurrentUser(user);
      fetchFacultyData();
    }
  }, [router]);

  const fetchFacultyData = async () => {
    try {
      setRefreshing(true);
      const analytics = await apiFetch<any>('/institutes/analytics/overview');
      if (analytics?.groupedFaculty) {
        setGroupedFaculty(analytics.groupedFaculty);
        // Default all institute accordions to expanded
        const initialOpen: Record<string, boolean> = {};
        analytics.groupedFaculty.forEach((g: any) => {
          initialOpen[g.instituteId] = true;
        });
        setOpenInstitutes(initialOpen);
      }
      if (analytics?.metrics) {
        setMetrics({
          totalTeachers: analytics.metrics.totalTeachers || 0,
          totalInstitutes: analytics.metrics.totalInstitutes || 0,
          totalCourses: analytics.metrics.totalCourses || 0,
        });
      }
      const instData = await apiFetch<any>('/institutes');
      const instList = Array.isArray(instData) ? instData : instData.institutes || [];
      setInstitutes(instList);
    } catch (e) {
      console.error('Failed to load faculty staff:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleInstitute = (instId: string) => {
    setOpenInstitutes((prev) => ({ ...prev, [instId]: !prev[instId] }));
  };

  // Filter grouped faculty data
  const filteredGroups = groupedFaculty.filter((group) => {
    if (selectedInstituteFilter !== 'ALL' && group.instituteId !== selectedInstituteFilter) {
      return false;
    }
    if (!search) return true;

    const matchesInstName = group.instituteName.toLowerCase().includes(search.toLowerCase());
    const matchesTeacher = group.teachers.some(
      (t: any) =>
        `${t.firstName} ${t.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase()),
    );
    return matchesInstName || matchesTeacher;
  });

  const exportToCSV = () => {
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Institute Name', 'Courses Assigned', 'Status'];
    const rows: any[] = [];
    groupedFaculty.forEach((group) => {
      group.teachers.forEach((t: any) => {
        rows.push([t.id, t.firstName, t.lastName, t.email, t.phone || '', group.instituteName, t.coursesCount, t.isActive ? 'Active' : 'Suspended']);
      });
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `faculty_staff_roster_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleUserStatus = async (userObj: any) => {
    const nextState = !userObj.isActive;
    try {
      await apiFetch(`/users/${userObj.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextState }),
      });
      fetchFacultyData();
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center text-xs gap-3">
        <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
        <span>Verifying super admin session...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Header & Breadcrumb */}
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
              <span className="text-teal-400 font-semibold">Faculty Staff</span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Faculty Staff Management</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchFacultyData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600/10 border border-teal-500/20 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Roster CSV</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="p-6 max-w-7xl w-full mx-auto space-y-6 flex-1">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-teal-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Faculty</span>
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{metrics.totalTeachers}</div>
            <p className="text-xs text-slate-400 mt-2">Active teaching faculty across platform</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Institutes Covered</span>
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Building className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{metrics.totalInstitutes}</div>
            <p className="text-xs text-slate-400 mt-2">Institutes with assigned faculty staff</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-purple-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Courses</span>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{metrics.totalCourses}</div>
            <p className="text-xs text-slate-400 mt-2">Courses actively taught by faculty</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teacher name, email, or institute..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Institute Filter:</span>
            </div>
            <select
              value={selectedInstituteFilter}
              onChange={(e) => setSelectedInstituteFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Institutes ({institutes.length})</option>
              {institutes.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Collapsible Institute Accordion Dropdowns */}
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
              <span>Loading faculty staff records...</span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
              <UserCheck className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No Faculty Staff Match Your Search</p>
              <p className="text-xs text-slate-500">Try adjusting your search query or institute dropdown filter.</p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const teachersList = group.teachers.filter(
                (t: any) =>
                  `${t.firstName} ${t.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
                  t.email.toLowerCase().includes(search.toLowerCase()) ||
                  group.instituteName.toLowerCase().includes(search.toLowerCase()),
              );

              const isOpen = openInstitutes[group.instituteId] ?? true;

              return (
                <div key={group.instituteId} className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition">
                  {/* Accordion Dropdown Header Bar */}
                  <button
                    onClick={() => toggleInstitute(group.instituteId)}
                    className="w-full p-4 px-6 bg-slate-900 hover:bg-slate-800/80 flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                        <Building className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          {group.instituteName}
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-teal-300 font-mono text-[11px] border border-slate-700">
                            {teachersList.length} Teacher(s)
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Faculty accounts assigned to this workspace</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="text-xs font-medium">{isOpen ? 'Hide Details' : 'View Faculty Details'}</span>
                      {isOpen ? <ChevronDown className="w-4 h-4 text-teal-400" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded Dropdown Table */}
                  {isOpen && (
                    <div className="border-t border-slate-800/80 bg-slate-950/60 p-4">
                      {teachersList.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">No teachers matched inside {group.instituteName}.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                          <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                              <tr>
                                <th className="py-3 px-4">Faculty Member</th>
                                <th className="py-3 px-4">Email</th>
                                <th className="py-3 px-4">Phone</th>
                                <th className="py-3 px-4">Assigned Courses</th>
                                <th className="py-3 px-4">Account Status</th>
                                <th className="py-3 px-4">Joined</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                              {teachersList.map((t: any) => (
                                <tr key={t.id} className="hover:bg-slate-800/50 transition group">
                                  <td className="py-3 px-4 font-semibold text-white">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold flex items-center justify-center shrink-0">
                                        {(t.firstName || 'T')[0]}
                                      </div>
                                      <span className="font-bold text-slate-100 group-hover:text-teal-400 transition">
                                        {t.firstName} {t.lastName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                                      <span>{t.email}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                                      <span>{t.phone || '—'}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-bold text-purple-400">
                                    {t.coursesCount} Course(s)
                                  </td>
                                  <td className="py-3 px-4">
                                    <button
                                      onClick={() => handleToggleUserStatus(t)}
                                      title="Click to toggle account status"
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit border transition cursor-pointer ${
                                        t.isActive
                                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                                          : 'bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/20'
                                      }`}
                                    >
                                      {t.isActive ? (
                                        <>
                                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                                          <span>ACTIVE</span>
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="w-3 h-3 text-red-400" />
                                          <span>SUSPENDED</span>
                                        </>
                                      )}
                                    </button>
                                  </td>
                                  <td className="py-3 px-4 text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                      <span>
                                        {t.createdAt
                                          ? new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                          : '—'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      onClick={() => setResetUser(t)}
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[10px] font-semibold transition cursor-pointer"
                                      title="Reset this account's password"
                                    >
                                      <KeyRound className="w-3.5 h-3.5 inline-block mr-1" />
                                      Reset Password
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Reset Password Modal */}
      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          onSuccess={() => fetchFacultyData()}
        />
      )}
    </div>
  );
}
