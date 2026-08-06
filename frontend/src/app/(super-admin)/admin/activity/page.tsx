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
  BookOpen,
  UserCheck,
  Users,
  Megaphone,
  Trash2,
  Video,
  Award,
  Radio,
  Zap,
} from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, UserRole } from '@/types';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';

export type ActivityType =
  | 'INSTITUTE_CREATED'
  | 'COURSE_CREATED'
  | 'COURSE_DELETED'
  | 'TEACHER_ADDED'
  | 'STUDENT_ENROLLED'
  | 'ANNOUNCEMENT_CREATED'
  | 'LESSON_CREATED'
  | 'TEST_PUBLISHED';

export interface SystemActivity {
  id: string;
  timestamp: string;
  type: ActivityType;
  title: string;
  details: string;
  instituteName?: string;
  isLive?: boolean;
}

const TYPE_CONFIG: Record<
  ActivityType,
  { label: string; bg: string; border: string; text: string; icon: React.ReactNode }
> = {
  INSTITUTE_CREATED: {
    label: 'INSTITUTE ONBOARDED',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    icon: <Building className="w-4 h-4" />,
  },
  COURSE_CREATED: {
    label: 'CATALOG PUBLISHED',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    icon: <BookOpen className="w-4 h-4" />,
  },
  COURSE_DELETED: {
    label: 'COURSE DELETED',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    icon: <Trash2 className="w-4 h-4" />,
  },
  TEACHER_ADDED: {
    label: 'FACULTY ASSIGNED',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    text: 'text-teal-400',
    icon: <UserCheck className="w-4 h-4" />,
  },
  STUDENT_ENROLLED: {
    label: 'STUDENT ROSTER',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: <Users className="w-4 h-4" />,
  },
  ANNOUNCEMENT_CREATED: {
    label: 'BROADCAST POSTED',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: <Megaphone className="w-4 h-4" />,
  },
  LESSON_CREATED: {
    label: 'LESSON UPLOADED',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    icon: <Video className="w-4 h-4" />,
  },
  TEST_PUBLISHED: {
    label: 'ASSESSMENT PUBLISHED',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    icon: <Award className="w-4 h-4" />,
  },
};

export default function ActivityAuditLogsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

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

  // Real-time socket stream integration: prepend live events instantly
  useRealtimeEvents({
    'course:created': (payload: any) => {
      const course = payload?.course || payload;
      if (course?.title) {
        setActivities((prev) => [
          {
            id: `live-course-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: 'COURSE_CREATED',
            title: `New Learning Catalog Published: "${course.title}"`,
            details: `Course "${course.title}" was published live to the institute catalog.`,
            isLive: true,
          },
          ...prev,
        ]);
      }
    },
    'course:deleted': (payload: any) => {
      if (payload?.id) {
        setActivities((prev) => [
          {
            id: `live-coursedel-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: 'COURSE_DELETED',
            title: `Course Catalog Deleted`,
            details: `Course ID "${payload.id}" was permanently removed by administrator.`,
            isLive: true,
          },
          ...prev,
        ]);
      }
    },
    'announcement:created': (payload: any) => {
      const ann = payload?.announcement;
      if (ann?.title) {
        const isCourseNotice = Boolean(ann.course?.title || ann.courseId);
        setActivities((prev) => [
          {
            id: `live-ann-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: 'ANNOUNCEMENT_CREATED',
            title: isCourseNotice
              ? `Course Notice Broadcasted: "${ann.title}"`
              : `Official Institute Broadcast: "${ann.title}"`,
            details: ann.content || `Announcement published across the platform.`,
            instituteName: ann.course?.title ? `Course: ${ann.course.title}` : undefined,
            isLive: true,
          },
          ...prev,
        ]);
      }
    },
    'lesson:created': (payload: any) => {
      const lesson = payload?.lesson;
      if (lesson?.title) {
        setActivities((prev) => [
          {
            id: `live-lesson-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: 'LESSON_CREATED',
            title: `Lesson Lecture Uploaded: "${lesson.title}"`,
            details: `New lecture material published to course curriculum.`,
            isLive: true,
          },
          ...prev,
        ]);
      }
    },
    'test:published': (payload: any) => {
      const test = payload?.test;
      if (test?.title) {
        setActivities((prev) => [
          {
            id: `live-test-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: 'TEST_PUBLISHED',
            title: `MCQ Assessment Published: "${test.title}"`,
            details: `New examination test with ${test.totalMarks || 100} total marks published.`,
            isLive: true,
          },
          ...prev,
        ]);
      }
    },
  });

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
            title: `Learning Catalogs Active`,
            details: `${inst.coursesCount} course catalog(s) published under ${inst.name}.`,
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
    if (categoryFilter === 'INSTITUTES' && act.type !== 'INSTITUTE_CREATED') return false;
    if (categoryFilter === 'COURSES' && act.type !== 'COURSE_CREATED' && act.type !== 'COURSE_DELETED' && act.type !== 'LESSON_CREATED') return false;
    if (categoryFilter === 'ASSESSMENTS' && act.type !== 'TEST_PUBLISHED') return false;
    if (categoryFilter === 'ANNOUNCEMENTS' && act.type !== 'ANNOUNCEMENT_CREATED') return false;

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      act.title.toLowerCase().includes(q) ||
      act.details.toLowerCase().includes(q) ||
      (act.instituteName || '').toLowerCase().includes(q)
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
              <span className="text-blue-400 font-semibold">Audit Stream</span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Real-Time Platform Audit Stream</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>SOCKET STREAM ACTIVE</span>
          </div>

          <button
            onClick={fetchActivityLogs}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh Stream</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="p-6 max-w-7xl w-full mx-auto space-y-6 flex-1">
        {/* Filter & Search Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit events or institutes..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto">
            <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Category:</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { id: 'ALL', label: 'All Events' },
                { id: 'INSTITUTES', label: 'Workspaces' },
                { id: 'COURSES', label: 'Courses & Lessons' },
                { id: 'ASSESSMENTS', label: 'Assessments' },
                { id: 'ANNOUNCEMENTS', label: 'Broadcasts' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Stream List */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400 fill-blue-400" />
              Live SaaS Ecosystem Audit Events
            </h3>
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>{filteredActivities.length} Event Log{filteredActivities.length !== 1 ? 's' : ''}</span>
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              <span>Connecting to audit event stream...</span>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center bg-slate-950/50 space-y-2 rounded-xl border border-slate-800">
              <Activity className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No Activity Logs Found</p>
              <p className="text-xs text-slate-500">Try adjusting your search criteria or category filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((act) => {
                const conf = TYPE_CONFIG[act.type] || TYPE_CONFIG.INSTITUTE_CREATED;
                return (
                  <div
                    key={act.id}
                    className={`p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4 hover:border-slate-700 transition group ${
                      act.isLive ? 'border-l-4 border-l-emerald-400 bg-slate-950/90 shadow-md shadow-emerald-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`p-2.5 rounded-xl ${conf.bg} border ${conf.border} ${conf.text} shrink-0 mt-0.5 group-hover:scale-110 transition`}
                      >
                        {conf.icon}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-wide uppercase border ${conf.bg} ${conf.border} ${conf.text}`}
                          >
                            {conf.label}
                          </span>

                          {act.isLive && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold animate-pulse">
                              LIVE EVENT
                            </span>
                          )}

                          {act.instituteName && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 text-[10px] font-mono border border-slate-800 flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-500" />
                              {act.instituteName}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-white">{act.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{act.details}</p>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-500 font-mono shrink-0 pt-0.5">{act.timestamp}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
