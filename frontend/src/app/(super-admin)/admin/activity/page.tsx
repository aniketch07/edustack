'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  Search,
  RefreshCw,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Clock,
  Building,
  Filter,
} from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, UserRole } from '@/types';

interface SystemActivity {
  id: string;
  timestamp: string;
  type: 'INSTITUTE_CREATED' | 'COURSE_CREATED' | 'TEACHER_ADDED' | 'STUDENT_ENROLLED';
  title: string;
  details: string;
  instituteName?: string;
}

export default function ActivityAuditLogsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else if (user.role !== UserRole.SUPER_ADMIN) {
      router.push('/login');
    } else {
      setCurrentUser(user);
      fetchActivityLogs();
    }
  }, [router]);

  const fetchActivityLogs = async () => {
    try {
      setRefreshing(true);
      const data = await apiFetch<any>('/institutes');
      let instList: any[] = [];
      if (Array.isArray(data)) instList = data;
      else if (data && data.institutes) instList = data.institutes;

      const feed: SystemActivity[] = [];
      instList.forEach((inst, idx) => {
        const createdDate = inst.createdAt
          ? new Date(inst.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Recently';

        feed.push({
          id: `act-inst-${idx}`,
          timestamp: createdDate,
          type: 'INSTITUTE_CREATED',
          title: `Institute Workspace Onboarded`,
          details: `Workspace "${inst.name}" (${inst.slug}) was activated on the platform with contact email ${inst.contactEmail || 'N/A'}.`,
          instituteName: inst.name,
        });

        if (inst.coursesCount && inst.coursesCount > 0) {
          feed.push({
            id: `act-course-${idx}`,
            timestamp: createdDate,
            type: 'COURSE_CREATED',
            title: `Learning Catalog Published`,
            details: `${inst.coursesCount} course catalog(s) published for ${inst.name}.`,
            instituteName: inst.name,
          });
        }

        if (inst.teachersCount && inst.teachersCount > 0) {
          feed.push({
            id: `act-teacher-${idx}`,
            timestamp: createdDate,
            type: 'TEACHER_ADDED',
            title: `Faculty Staff Assigned`,
            details: `${inst.teachersCount} teacher account(s) registered under ${inst.name}.`,
            instituteName: inst.name,
          });
        }

        if (inst.studentsCount && inst.studentsCount > 0) {
          feed.push({
            id: `act-student-${idx}`,
            timestamp: createdDate,
            type: 'STUDENT_ENROLLED',
            title: `Student Roster Updated`,
            details: `${inst.studentsCount} active student(s) enrolled in ${inst.name}.`,
            instituteName: inst.name,
          });
        }
      });

      setActivities(feed);
    } catch (e) {
      console.error('Failed to load activity logs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredActivities = activities.filter((act) => {
    if (typeFilter !== 'ALL' && act.type !== typeFilter) return false;
    if (!search) return true;
    return (
      act.title.toLowerCase().includes(search.toLowerCase()) ||
      act.details.toLowerCase().includes(search.toLowerCase()) ||
      (act.instituteName || '').toLowerCase().includes(search.toLowerCase())
    );
  });

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
              <span className="text-blue-400 font-semibold">Activity Feed</span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Real-Time Activity & Audit Feed</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchActivityLogs}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh Audit Logs</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="p-6 max-w-7xl w-full mx-auto space-y-6 flex-1">
        {/* Filter & Search Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit logs by event or institute..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Event Category:</span>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Activity Types</option>
              <option value="INSTITUTE_CREATED">Institute Onboardings</option>
              <option value="COURSE_CREATED">Course Publishing</option>
              <option value="TEACHER_ADDED">Faculty Staff Registrations</option>
              <option value="STUDENT_ENROLLED">Student Enrollments</option>
            </select>
          </div>
        </div>

        {/* Audit Stream List */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Live System Audit Stream
            </h3>
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Real-Time Events ({filteredActivities.length})</span>
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              <span>Streaming audit activity logs...</span>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center bg-slate-950/50 space-y-2 rounded-xl border border-slate-800">
              <Activity className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No Activity Logs Found</p>
              <p className="text-xs text-slate-500">Try adjusting your search criteria or category filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4 hover:border-slate-700 transition group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0 mt-0.5 group-hover:scale-110 transition">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{act.title}</span>
                        {act.instituteName && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-blue-300 text-[10px] font-mono border border-slate-800 flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-500" />
                            {act.instituteName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{act.details}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono shrink-0">{act.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
