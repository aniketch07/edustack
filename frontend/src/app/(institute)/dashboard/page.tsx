'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, UserCheck, BookOpen, Megaphone, LogOut, Plus, Palette, Trash2, CheckCircle2, Image as ImageIcon, Building2 } from 'lucide-react';
import { getUser, removeToken, setUser, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, Course } from '@/types';

export default function InstituteAdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Announcement Modal State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
  const [announcementSuccess, setAnnouncementSuccess] = useState<string | null>(null);

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
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to update branding.');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await apiFetch(`/announcements/${id}`, { method: 'DELETE' });
      fetchStatsAndAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Failed to delete announcement.');
    }
  };

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  const instLogo = currentUser?.institute?.logoUrl || logoUrl;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {instLogo ? (
            <img
              src={instLogo}
              alt={currentUser?.institute?.name || 'Institute Logo'}
              className="w-8 h-8 rounded-lg object-contain bg-slate-950 border border-slate-800 p-0.5"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold flex items-center justify-center text-xs">
              {(currentUser?.institute?.name || 'D')[0]}
            </div>
          )}
          <span className="font-bold text-lg text-white">
            {currentUser?.institute?.name || 'Demo Coaching Academy'}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            Institute Admin Portal
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Institute Overview</h1>
            <p className="text-slate-400 text-sm mt-1">Manage teachers, students, courses, custom logo branding, and announcements.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBrandingModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              <Palette className="w-4 h-4 text-emerald-400" />
              Customize Branding & Logo
            </button>
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-purple-600/20"
            >
              <Megaphone className="w-4 h-4" />
              Post Announcement
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Link href="/students" className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl p-5 shadow-sm transition block">
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Students</span>
              <Users className="w-5 h-5" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">{studentCount}</div>
            <div className="text-xs text-slate-400 mt-1">Active student directory</div>
          </Link>

          <Link href="/teachers" className="bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-xl p-5 shadow-sm transition block">
            <div className="flex items-center justify-between text-teal-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Teachers</span>
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">{teacherCount}</div>
            <div className="text-xs text-slate-400 mt-1">Assigned faculty</div>
          </Link>

          <Link href="/courses" className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-5 shadow-sm transition block">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Courses</span>
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">{courseCount}</div>
            <div className="text-xs text-slate-400 mt-1">Published & draft courses</div>
          </Link>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-purple-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Announcements</span>
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">{announcements.length}</div>
            <div className="text-xs text-slate-400 mt-1">Published broadcasts</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Announcements Feed Manager */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-purple-400" />
                Institute Broadcast Announcements
              </h2>
              <span className="text-xs text-slate-500">{announcements.length} Active</span>
            </div>

            {announcements.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/50">
                <Megaphone className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-400">No Broadcast Announcements</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Click "Post Announcement" to send updates to all teachers & students.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {announcements.map((a) => (
                  <div key={a.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white">{a.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{a.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(a.id)}
                      className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition shrink-0"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Branding & Quick Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Institute Logo & Branding
              </h2>
              <button
                onClick={() => setShowBrandingModal(true)}
                className="text-xs font-bold text-emerald-400 hover:underline"
              >
                Edit Logo
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4">
              {instLogo ? (
                <img
                  src={instLogo}
                  alt="Institute Logo"
                  className="w-14 h-14 rounded-xl object-contain bg-slate-900 border border-slate-700 p-1"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold flex items-center justify-center text-xl">
                  {(currentUser?.institute?.name || 'D')[0]}
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-white">{currentUser?.institute?.name}</h3>
                <p className="text-xs text-slate-400">{currentUser?.institute?.contactEmail}</p>
                <p className="text-[11px] text-emerald-400 font-semibold mt-1">Logo displayed on Admin, Teacher & Student dashboards</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Link href="/courses" className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-left transition block">
                <Plus className="w-5 h-5 text-blue-400 mb-2" />
                <div className="text-xs font-bold text-white">Add Course</div>
              </Link>
              <Link href="/students" className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition block">
                <Plus className="w-5 h-5 text-emerald-400 mb-2" />
                <div className="text-xs font-bold text-white">Add Student</div>
              </Link>
              <Link href="/teachers" className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 text-left transition block">
                <Plus className="w-5 h-5 text-teal-400 mb-2" />
                <div className="text-xs font-bold text-white">Add Teacher</div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Customize Institute Branding Modal */}
      {showBrandingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Palette className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Customize Institute Branding & Logo</h3>
              </div>
              <button onClick={() => setShowBrandingModal(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            {brandingSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {brandingSuccess}
              </div>
            )}

            <form onSubmit={handleSaveBranding} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Institute Logo URL (Image URL)</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png or image URL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {logoUrl && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-medium">Logo Preview:</span>
                  <img src={logoUrl} alt="Preview" className="w-10 h-10 object-contain rounded-lg border border-slate-800 p-1" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Accent Color</label>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer p-1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Secondary Accent Color</label>
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer p-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBrandingModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBranding}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {savingBranding ? 'Saving Logo...' : 'Save Branding & Logo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Broadcast Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Megaphone className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Post Broadcast Announcement</h3>
              </div>
              <button onClick={() => setShowAnnouncementModal(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            {announcementSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {announcementSuccess}
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAnnouncement}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {submittingAnnouncement ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
