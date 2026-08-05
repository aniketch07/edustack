'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building,
  Users,
  BookOpen,
  UserCheck,
  RefreshCw,
  Loader2,
  Activity,
  TrendingUp,
  Award,
  PieChart,
  BarChart3,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  Server,
  Database,
  HardDrive,
} from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, UserRole } from '@/types';

// SVG Vector Sparkline Component for KPI Trend Cards
function Sparkline({ data, color = '#38bdf8' }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * 100;
      const y = 32 - ((val - min) / range) * 24;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,35 ${points} 100,35`;

  return (
    <div className="w-24 h-8 shrink-0">
      <svg viewBox="0 0 100 35" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
        <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [metrics, setMetrics] = useState({
    totalInstitutes: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalCourses: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else if (user.role !== UserRole.SUPER_ADMIN) {
      router.push('/login');
    } else {
      setCurrentUser(user);
      fetchOverviewData();
    }
  }, [router]);

  const fetchOverviewData = async () => {
    try {
      setRefreshing(true);
      const analytics = await apiFetch<any>('/institutes/analytics/overview');
      if (analytics) {
        setAnalyticsData(analytics);
        if (analytics.metrics) {
          setMetrics(analytics.metrics);
        }
      }
    } catch (e) {
      console.error('Failed to load overview analytics:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center text-xs gap-3">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span>Verifying super admin session...</span>
      </div>
    );
  }

  // When analytics load, use real data. When they're unavailable (loading/error),
  // show an honest "unavailable" state instead of fabricated numbers.
  const dataUnavailable = analyticsData === null;

  const roleDist = analyticsData?.roleDistribution || {
    students: metrics.totalStudents,
    teachers: metrics.totalTeachers,
    instituteAdmins: 0,
    percentages: { students: 0, teachers: 0, admins: 0 },
  };

  const growthTimeline = analyticsData?.growthTimeline || [];

  const sparklines = analyticsData?.sparklines || {
    institutesTrend: [],
    teachersTrend: [],
    studentsTrend: [],
    coursesTrend: [],
  };

  const healthSignals = analyticsData?.healthSignals || {
    apiStatus: dataUnavailable ? null : 'UNKNOWN',
    dbStatus: dataUnavailable ? 'UNAVAILABLE' : 'UNKNOWN',
    responseTimeMs: null,
    totalUploads: 0,
    storageUsedMb: 0,
    pendingItems: 0,
    storageReal: false,
  };

  const topInstitutes = analyticsData?.topInstitutes || [];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Platform Overview & Visual Analytics
          </h2>
        </div>

        <button
          onClick={fetchOverviewData}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
          <span>Refresh Real Analytics</span>
        </button>
      </header>

      {/* Main Container */}
      <div className="p-6 max-w-7xl w-full mx-auto space-y-6 flex-1">
        {/* Platform Health Signal Strip */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            {dataUnavailable ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-lg shadow-amber-500/50" />
                <span className="text-xs font-bold text-white tracking-tight">System Status: Unavailable</span>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50" />
                <span className="text-xs font-bold text-white tracking-tight">System Status: All Services Operational</span>
              </>
            )}
          </div>

          {!dataUnavailable && (
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                <span>API Gateway:</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {healthSignals.apiStatus ?? '—'} {healthSignals.responseTimeMs != null ? `(${healthSignals.responseTimeMs}ms)` : ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" />
                <span>Database:</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {healthSignals.dbStatus}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-teal-400" />
                <span>Cloud Storage:</span>
                <span className="text-white font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {healthSignals.storageUsedMb} MB
                </span>
                {healthSignals.storageReal ? (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                    LIVE
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold">
                    EST.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4 Interactive Module KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Institutes */}
          <Link
            href="/admin/institutes"
            className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-pointer overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-400 transition">
                Institutes
              </span>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition">
                <Building className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-end justify-between mt-4">
              <div>
                <div className="text-3xl font-black text-white tracking-tight">{metrics.totalInstitutes}</div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Real Database Count</span>
                </div>
              </div>
              <Sparkline data={sparklines.institutesTrend} color="#38bdf8" />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-white transition">
              <span>Manage Workspaces</span>
              <ArrowUpRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </div>
          </Link>

          {/* Card 2: Faculty Staff */}
          <Link
            href="/admin/teachers"
            className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-pointer overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-teal-400 transition">
                Faculty Staff
              </span>
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:scale-110 transition">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-end justify-between mt-4">
              <div>
                <div className="text-3xl font-black text-white tracking-tight">{metrics.totalTeachers}</div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-teal-400 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Teaching Faculty</span>
                </div>
              </div>
              <Sparkline data={sparklines.teachersTrend} color="#2dd4bf" />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-white transition">
              <span>Open Faculty Roster</span>
              <ArrowUpRight className="w-4 h-4 text-teal-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </div>
          </Link>

          {/* Card 3: Enrolled Students */}
          <Link
            href="/admin/students"
            className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-pointer overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-400 transition">
                Enrolled Students
              </span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-end justify-between mt-4">
              <div>
                <div className="text-3xl font-black text-white tracking-tight">{metrics.totalStudents}</div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Active Learners</span>
                </div>
              </div>
              <Sparkline data={sparklines.studentsTrend} color="#34d399" />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-white transition">
              <span>Open Student Roster</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </div>
          </Link>

          {/* Card 4: Published Courses */}
          <Link
            href="/admin/courses"
            className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-pointer overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-purple-400 transition">
                Published Courses
              </span>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-end justify-between mt-4">
              <div>
                <div className="text-3xl font-black text-white tracking-tight">{metrics.totalCourses}</div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-purple-400 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Learning Catalogs</span>
                </div>
              </div>
              <Sparkline data={sparklines.coursesTrend} color="#c084fc" />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-white transition">
              <span>Open Course Catalogs</span>
              <ArrowUpRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </div>
          </Link>
        </div>

        {/* Visual Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: 6-Week Growth Timeline (Real PostgreSQL Time-Series Data) */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  Platform Growth Timeline (PostgreSQL Time-Series)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Historical creation trends over past 6 weeks</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-blue-400">
                  <div className="w-3 h-3 rounded-sm bg-blue-500" />
                  <span>Institutes</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span>Users</span>
                </div>
              </div>
            </div>

            <div className="h-48 flex items-end justify-between gap-4 pt-4 px-2">
              {growthTimeline.map((item: any, idx: number) => {
                const maxVal = Math.max(...growthTimeline.map((g: any) => Math.max(g.institutes, g.users)), 1);
                const instHeight = Math.max(12, Math.round((item.institutes / maxVal) * 140));
                const userHeight = Math.max(12, Math.round((item.users / maxVal) * 140));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full flex items-end justify-center gap-1.5 h-36">
                      <div
                        style={{ height: `${instHeight}px` }}
                        className="w-1/2 max-w-[24px] bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-300 group-hover:brightness-125"
                      />
                      <div
                        style={{ height: `${userHeight}px` }}
                        className="w-1/2 max-w-[24px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all duration-300 group-hover:brightness-125"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 font-bold">{item.period}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: User Role Distribution Donut Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-400" />
                User Roles Distribution
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Platform user demographic breakdown</p>

              <div className="my-6 space-y-3">
                {/* Students Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-emerald-400">Students</span>
                    <span className="text-white">{roleDist.students} ({roleDist.percentages?.students || 0}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${roleDist.percentages?.students || 0}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Teachers Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-teal-400">Faculty Teachers</span>
                    <span className="text-white">{roleDist.teachers} ({roleDist.percentages?.teachers || 0}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${roleDist.percentages?.teachers || 0}%` }}
                      className="h-full bg-teal-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Admins Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-blue-400">Institute Admins</span>
                    <span className="text-white">{roleDist.instituteAdmins} ({roleDist.percentages?.admins || 0}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${roleDist.percentages?.admins || 0}%` }}
                      className="h-full bg-blue-500 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Total Accounts:</span>
              <span className="font-bold text-white font-mono">{metrics.totalUsers} Accounts</span>
            </div>
          </div>
        </div>

        {/* Top Institutes Leaderboard */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Top Institutes Leaderboard
            </h3>
            <Link
              href="/admin/institutes"
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
            >
              <span>View All Workspaces ({metrics.totalInstitutes})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topInstitutes.map((inst: any, idx: number) => (
              <div
                key={inst.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 text-xs font-black flex items-center justify-center shrink-0 shadow-md">
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition">{inst.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">slug: {inst.slug}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-emerald-400">{inst.studentsCount || 0} Students</span>
                  <p className="text-[10px] text-slate-400">{inst.coursesCount || 0} Courses</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
