'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  BookOpen,
  Megaphone,
  LogOut,
  Plus,
  Palette,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Building2,
  RefreshCw,
  X,
  Loader2,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { getUser, removeToken, setUser, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, Course } from '@/types';
import FileUpload from '@/components/FileUpload';
import { useAnnouncementToasts } from '@/hooks/useAnnouncementToasts';

export default function InstituteAdminDashboard() {
  const router = useRouter();
  useAnnouncementToasts(
    (newAnnouncement) => {
      if (newAnnouncement?.id) {
        setAnnouncements((prev) => [newAnnouncement, ...prev.filter((a) => a.id !== newAnnouncement.id)]);
      }
    },
    (deletedId) => {
      if (deletedId) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== deletedId));
      }
    },
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Announcement Modal State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
  const [announcementSuccess, setAnnouncementSuccess] = useState<string | null>(null);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);

  // Branding Customizer Modal State
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('#10B981');
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState<string | null>(null);

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else {
      setCurrentUser(user);
      if (user.institute) {
        setLogoUrl(user.institute.logoUrl || '');
        setPrimaryColor(user.institute.primaryColor || '#3B82F6');
        setSecondaryColor(user.institute.secondaryColor || '#10B981');
      }
      fetchStatsAndAnnouncements();
    }
  }, [router]);

  const fetchStatsAndAnnouncements = async () => {
    try {
      setRefreshing(true);
      const [students, teachers, courses, announcementsData] = await Promise.all([
        apiFetch<User[]>('/users?role=STUDENT'),
        apiFetch<User[]>('/users?role=TEACHER'),
        apiFetch<Course[]>('/courses'),
        apiFetch<any[]>('/announcements'),
      ]);
      setStudentCount(students.length);
      setTeacherCount(teachers.length);
      setCourseCount(courses.length);
      setAnnouncements(announcementsData);
    } catch (e) {
      console.error('Failed to load institute dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle || !announcementContent) return;
    setSubmittingAnnouncement(true);
    setAnnouncementSuccess(null);

    try {
      await apiFetch('/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: announcementTitle,
          content: announcementContent,
          isPublished: true,
        }),
      });

      setAnnouncementSuccess('Broadcast announcement published successfully!');
      setTimeout(() => {
        setShowAnnouncementModal(false);
        setAnnouncementTitle('');
        setAnnouncementContent('');
        setAnnouncementSuccess(null);
        fetchStatsAndAnnouncements();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to publish announcement.');
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranding(true);
    setBrandingSuccess(null);

    try {
      const res = await apiFetch<any>('/institutes/me/branding', {
        method: 'PATCH',
        body: JSON.stringify({
          logoUrl: logoUrl || undefined,
          primaryColor,
          secondaryColor,
        }),
      });

      setBrandingSuccess('Institute Logo & Branding updated successfully!');

      if (currentUser && currentUser.institute) {
        const updatedUser: User = {
          ...currentUser,
          institute: {
            ...currentUser.institute,
            logoUrl: logoUrl || currentUser.institute.logoUrl,
            primaryColor,
            secondaryColor,
          },
        };
        setCurrentUser(updatedUser);
        setUser(updatedUser);
      }

      setTimeout(() => {
        setShowBrandingModal(false);
        setBrandingSuccess(null);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to update branding.');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    setDeletingAnnouncementId(id);

    try {
      await apiFetch(`/announcements/${id}`, { method: 'DELETE' });
      fetchStatsAndAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to delete announcement.');
    } finally {
      setDeletingAnnouncementId(null);
    }
  };

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  const instLogo = currentUser?.institute?.logoUrl || logoUrl;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center text-xs gap-3">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        <span>Loading institute portal...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Page Heading & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Institute Overview</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Manage teachers, students, courses, custom logo branding, and broadcast notices.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={fetchStatsAndAnnouncements}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={() => setShowBrandingModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-200 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            >
              <Palette className="w-4 h-4 text-emerald-400" />
              <span>Branding & Logo</span>
            </button>
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-purple-600/20 active:scale-95 cursor-pointer"
            >
              <Megaphone className="w-4 h-4" />
              <span>Post Announcement</span>
            </button>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Link
            href="/students"
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group block"
          >
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Students</span>
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{studentCount}</div>
            <div className="text-xs text-slate-400 mt-2 font-medium flex items-center justify-between">
              <span>Active student directory</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          <Link
            href="/teachers"
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-teal-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group block"
          >
            <div className="flex items-center justify-between text-teal-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Teachers</span>
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{teacherCount}</div>
            <div className="text-xs text-slate-400 mt-2 font-medium flex items-center justify-between">
              <span>Assigned faculty staff</span>
              <ArrowRight className="w-3.5 h-3.5 text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          <Link
            href="/courses"
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group block"
          >
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Courses</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{courseCount}</div>
            <div className="text-xs text-slate-400 mt-2 font-medium flex items-center justify-between">
              <span>Published & draft courses</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between text-purple-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Announcements</span>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Megaphone className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{announcements.length}</div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Published broadcasts</div>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Announcements Feed Manager */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="w-4.5 h-4.5 text-purple-400" />
                <span>Institute Broadcast Announcements</span>
              </h2>
              <span className="text-xs font-semibold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
                {announcements.length} Active
              </span>
            </div>

            {announcements.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/50 space-y-1">
                <Megaphone className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-400">No Broadcast Announcements</p>
                <p className="text-[11px] text-slate-500">
                  Click "Post Announcement" to broadcast news to all faculty and students.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className={`p-3.5 rounded-xl border backdrop-blur-md transition-all flex items-start justify-between gap-3 ${
                      a.course
                        ? 'border-l-4 border-l-purple-500 border-purple-500/20 bg-gradient-to-r from-purple-950/20 via-slate-900/90 to-slate-900/90'
                        : 'border-l-4 border-l-blue-500 border-blue-500/20 bg-gradient-to-r from-blue-950/20 via-slate-900/90 to-slate-900/90'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {a.course ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-extrabold tracking-wide uppercase flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-purple-400" />
                            Course: {a.course.title}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-extrabold tracking-wide uppercase flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-blue-400" />
                            Official Institute Broadcast
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white">{a.title}</h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{a.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(a.id)}
                      disabled={deletingAnnouncementId === a.id}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors shrink-0 disabled:opacity-50 cursor-pointer mt-1"
                      title="Delete Announcement"
                    >
                      {deletingAnnouncementId === a.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Branding Preview & Quick Actions */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4.5 h-4.5 text-emerald-400" />
                <span>Institute Branding & Logo</span>
              </h2>
              <button
                onClick={() => setShowBrandingModal(true)}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                Edit Branding
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-4">
              {instLogo ? (
                <img
                  src={instLogo}
                  alt="Institute Logo"
                  className="w-14 h-14 rounded-xl object-contain bg-slate-900 border border-slate-700 p-1 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold flex items-center justify-center text-xl shrink-0">
                  {(currentUser?.institute?.name || 'D')[0]}
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-white">{currentUser?.institute?.name}</h3>
                <p className="text-xs text-slate-400">{currentUser?.institute?.contactEmail}</p>
                <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                  Active logo shown across Admin, Teacher & Student portals
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Link
                href="/courses"
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 text-left transition-all hover:-translate-y-0.5 group block"
              >
                <Plus className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-white">Add Course</div>
              </Link>
              <Link
                href="/students"
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 text-left transition-all hover:-translate-y-0.5 group block"
              >
                <Plus className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-white">Add Student</div>
              </Link>
              <Link
                href="/teachers"
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-teal-500/50 text-left transition-all hover:-translate-y-0.5 group block"
              >
                <Plus className="w-5 h-5 text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-white">Add Teacher</div>
              </Link>
            </div>
          </div>
        </div>

      {/* Customize Institute Branding Modal */}
      {showBrandingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Palette className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Customize Institute Branding & Logo</h3>
              </div>
              <button
                onClick={() => setShowBrandingModal(false)}
                className="text-slate-400 hover:text-white p-1 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {brandingSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>{brandingSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveBranding} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Institute Logo
                </label>
                <FileUpload
                  folder="institutes"
                  accept="image/png,image/jpeg,image/webp"
                  label=""
                  description="Upload institute logo — max 25 MB (PNG, JPG, WEBP)"
                  onUploadComplete={(publicUrl) => setLogoUrl(publicUrl)}
                />
                {logoUrl && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-medium">Logo Preview:</span>
                    <img
                      src={logoUrl}
                      alt="Preview"
                      className="w-10 h-10 object-contain rounded-lg border border-slate-800 p-1"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer p-1 shrink-0"
                    />
                    <span className="text-xs font-mono text-slate-400">{primaryColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Secondary Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer p-1 shrink-0"
                    />
                    <span className="text-xs font-mono text-slate-400">{secondaryColor}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBrandingModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBranding}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {savingBranding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Logo...</span>
                    </>
                  ) : (
                    <span>Save Branding & Logo</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Broadcast Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Megaphone className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Post Broadcast Announcement</h3>
              </div>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="text-slate-400 hover:text-white p-1 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {announcementSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>{announcementSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Announcement Title *</label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="e.g., Mid-Term Exam Schedule & Holiday Notice"
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Announcement Message *</label>
                <textarea
                  rows={4}
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="Detailed announcement broadcasted to all teachers and students..."
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAnnouncement}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submittingAnnouncement ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <span>Publish Announcement</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
