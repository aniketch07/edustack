'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Video, FileText, Calendar, LogOut, Search, UserCheck, Play, Download, CheckCircle2, XCircle, Award, HelpCircle, Clock, CheckSquare, Megaphone, ExternalLink, Check, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, Course } from '@/types';

export default function StudentDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [upcomingLiveSessions, setUpcomingLiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallAttendance, setOverallAttendance] = useState<any | null>(null);
  const [courseProgressMap, setCourseProgressMap] = useState<{ [courseId: string]: any }>({});

  // Selected Course Viewer Modal State
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<'materials' | 'attendance' | 'tests' | 'live'>('materials');
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonProgressMap, setLessonProgressMap] = useState<{ [lessonId: string]: any }>({});
  const [courseAttendance, setCourseAttendance] = useState<any | null>(null);
  const [courseTests, setCourseTests] = useState<any[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [activeLesson, setActiveLesson] = useState<any | null>(null);

  // Test Taking Engine Modal State
  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [userAnswers, setUserAnswers] = useState<{ [questionId: string]: number }>({});
  const [submittingTest, setSubmittingTest] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedTimeRef = useRef<number>(0);

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else {
      setCurrentUser(user);
      fetchStudentData();
    }
  }, [router]);

  const fetchStudentData = async () => {
    try {
      const [coursesData, attendanceData, announcementsData] = await Promise.all([
        apiFetch<Course[]>('/students/me/courses'),
        apiFetch<any>('/students/me/attendance'),
        apiFetch<any[]>('/announcements'),
      ]);
      setEnrolledCourses(coursesData);
      setOverallAttendance(attendanceData);
      setAnnouncements(announcementsData);

      const progressPromises = coursesData.map((c) =>
        apiFetch<any>(`/courses/${c.id}/progress`).catch(() => null),
      );
      const livePromises = coursesData.map((c) =>
        apiFetch<any[]>(`/courses/${c.id}/live-classes?upcoming=true`).catch(() => []),
      );

      const [progressResults, liveResults] = await Promise.all([
        Promise.all(progressPromises),
        Promise.all(livePromises),
      ]);

      const pMap: { [id: string]: any } = {};
      const allUpcomingLive: any[] = [];
      const now = new Date();

      coursesData.forEach((c, idx) => {
        if (progressResults[idx]) {
          pMap[c.id] = progressResults[idx];
        }
        const sessions = liveResults[idx] || [];
        sessions.forEach((s: any) => {
          if (new Date(s.scheduledAt) >= now) {
            allUpcomingLive.push({ ...s, courseTitle: c.title });
          }
        });
      });

      setCourseProgressMap(pMap);
      setUpcomingLiveSessions(allUpcomingLive);
    } catch (e) {
      console.error('Failed to load student dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCourseModal = async (course: Course) => {
    setSelectedCourse(course);
    setActiveTab('materials');
    setLoadingModalData(true);
    setActiveLesson(null);

    try {
      const [lessonsData, attendanceData, testsData, liveClassesData, progressData] = await Promise.all([
        apiFetch<any[]>(`/courses/${course.id}/lessons`),
        apiFetch<any>(`/students/me/attendance?courseId=${course.id}`),
        apiFetch<any[]>(`/courses/${course.id}/tests`),
        apiFetch<any[]>(`/courses/${course.id}/live-classes`),
        apiFetch<any>(`/courses/${course.id}/progress`),
      ]);

      setLessons(lessonsData);
      setCourseAttendance(attendanceData);
      setCourseTests(testsData);
      setLiveClasses(liveClassesData);

      const lpMap: { [id: string]: any } = {};
      if (progressData?.progressList) {
        progressData.progressList.forEach((p: any) => {
          lpMap[p.lessonId] = p;
        });
      }
      setLessonProgressMap(lpMap);

      const firstVideo = lessonsData.find((l) => l.videoUrl);
      if (firstVideo) setActiveLesson(firstVideo);
    } catch (err: any) {
      console.error('Failed to load course details:', err);
    } finally {
      setLoadingModalData(false);
    }
  };

  const handleTimeUpdate = async () => {
    if (!videoRef.current || !activeLesson) return;
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;

    if (!duration || isNaN(duration)) return;

    if (Math.abs(currentTime - lastSavedTimeRef.current) >= 5 || currentTime >= duration - 1) {
      lastSavedTimeRef.current = currentTime;
      try {
        const res = await apiFetch<any>(`/lessons/${activeLesson.id}/progress`, {
          method: 'POST',
          body: JSON.stringify({
            watchedDuration: currentTime,
            totalDuration: duration,
          }),
        });

        if (res.progress) {
          setLessonProgressMap((prev) => ({
            ...prev,
            [activeLesson.id]: res.progress,
          }));

          if (selectedCourse) {
            const updatedCourseProgress = await apiFetch<any>(`/courses/${selectedCourse.id}/progress`);
            setCourseProgressMap((prev) => ({
              ...prev,
              [selectedCourse.id]: updatedCourseProgress,
            }));
          }
        }
      } catch (e) {
        console.error('Failed to sync video progress:', e);
      }
    }
  };

  const handleSelectLesson = (lesson: any) => {
    setActiveLesson(lesson);
    const existingProgress = lessonProgressMap[lesson.id];
    if (existingProgress && videoRef.current) {
      videoRef.current.currentTime = existingProgress.watchedDuration || 0;
    }
  };

  const handleStartTest = (test: any) => {
    setActiveTest(test);
    setUserAnswers({});
    setTestResult(null);
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmitTest = async () => {
    if (!activeTest) return;
    setSubmittingTest(true);

    try {
      const res = await apiFetch<any>(`/tests/${activeTest.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: userAnswers }),
      });

      setTestResult(res.attempt || res);
      if (selectedCourse) {
        const updatedTests = await apiFetch<any[]>(`/courses/${selectedCourse.id}/tests`);
        setCourseTests(updatedTests);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit test.');
    } finally {
      setSubmittingTest(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  const instLogo = currentUser?.institute?.logoUrl;

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
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-extrabold flex items-center justify-center text-xs">
              {(currentUser?.institute?.name || 'D')[0]}
            </div>
          )}
          <span className="font-bold text-lg text-white">
            {currentUser?.institute?.name || 'Demo Coaching Academy'}
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
            Student Academy Portal
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

      {/* Main Container */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Title & Refresh Control */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Student Learning Dashboard</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Access your enrolled courses, watch video lectures, join scheduled live classes, download notes, and take tests.
            </p>
          </div>
          <button
            onClick={fetchStudentData}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all active:scale-95 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Refresh Portal</span>
          </button>
        </div>

        {/* Upcoming Live Classes Alert Banner */}
        {upcomingLiveSessions.length > 0 && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/30 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Video className="w-4 h-4 text-emerald-400 animate-pulse" />
                Upcoming Live Class Alerts ({upcomingLiveSessions.length})
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold">Google Meet & Zoom Sessions</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingLiveSessions.map((session) => {
                const scheduledDate = new Date(session.scheduledAt).toLocaleString('en-IN', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={session.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white">{session.title}</p>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                          {session.courseTitle}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Time: {scheduledDate} | {session.duration} Mins</p>
                    </div>

                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-md shadow-emerald-600/20"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Join Live
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Announcements Banner */}
        {announcements.length > 0 && (
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
              <Megaphone className="w-4 h-4" />
              Academy Announcements Broadcast
            </div>
            {announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="text-xs text-slate-300">
                <span className="font-bold text-white">{a.title}: </span>
                <span>{a.content}</span>
              </div>
            ))}
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Enrolled Courses</span>
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{enrolledCourses.length}</div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Allocated by Institute</div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attendance Score</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-400 mt-3">
              {overallAttendance?.percentage !== null && overallAttendance?.percentage !== undefined
                ? `${overallAttendance.percentage}%`
                : 'N/A'}
            </div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Overall Present rate</div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-teal-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between text-teal-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Classes</span>
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform">
                <Video className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-teal-400 mt-3">{upcomingLiveSessions.length}</div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Scheduled sessions</div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between text-purple-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">MCQ Quizzes</span>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                <HelpCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-purple-400 mt-3">Ready</div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Interactive auto-graded tests</div>
          </div>
        </div>

        {/* Enrolled Courses Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              Your Enrolled Courses
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Click any course to watch video lectures, track completion, join live classes, take tests, and check attendance</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading your enrolled courses...</div>
          ) : enrolledCourses.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/50 space-y-2">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No Courses Allocated Yet</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your Institute Admin will allocate courses to your student account. Once allocated, your learning materials will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((course: any) => {
                const progressData = courseProgressMap[course.id];
                const pct = progressData?.percentage || 0;
                const completedCnt = progressData?.completedCount || 0;
                const totalCnt = progressData?.totalLessons || course._count?.lessons || 0;
                const thumb = course.thumbnailUrl || course.thumbnail;

                return (
                  <div key={course.id} className="bg-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between transition group">
                    {/* Course Thumbnail Image Header */}
                    {thumb ? (
                      <div className="h-36 w-full overflow-hidden bg-slate-900 relative">
                        <img src={thumb} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                      </div>
                    ) : null}

                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-blue-500/10 text-blue-400 border-blue-500/20">
                          ENROLLED
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-300">
                          {course.price === 0 ? 'FREE' : `₹${course.price.toLocaleString('en-IN')}`}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition">{course.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{course.description}</p>
                    </div>

                    <div className="p-5 border-t border-slate-800/80 bg-slate-900/40 space-y-3">
                      {/* Visual Course Completion Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-medium">
                          <span className="text-slate-400">Course Completion</span>
                          <span className="text-teal-400 font-bold">{completedCnt} of {totalCnt} lessons ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-400 font-medium flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                          {course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : 'Faculty Teacher'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenCourseModal(course)}
                        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white text-xs font-bold transition shadow-md shadow-blue-600/20"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        View Materials, Live & Tests
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl space-y-4 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  {selectedCourse.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedCourse.description}</p>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
                className="text-slate-400 hover:text-white p-1 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 flex items-center gap-4 border-b border-slate-800">
              <button
                onClick={() => setActiveTab('materials')}
                className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                  activeTab === 'materials'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-4 h-4" />
                Lessons & Materials ({lessons.length})
              </button>

              <button
                onClick={() => setActiveTab('live')}
                className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                  activeTab === 'live'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-4 h-4 text-emerald-400" />
                Live Classes ({liveClasses.length})
              </button>

              <button
                onClick={() => setActiveTab('tests')}
                className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                  activeTab === 'tests'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                MCQ Tests ({courseTests.length})
              </button>

              <button
                onClick={() => setActiveTab('attendance')}
                className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                  activeTab === 'attendance'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Attendance ({courseAttendance?.percentage !== null && courseAttendance?.percentage !== undefined ? `${courseAttendance.percentage}%` : 'N/A'})
              </button>
            </div>

            {/* Modal Tab Contents */}
            <div className="p-6 flex-1 overflow-y-auto">
              {loadingModalData ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading course details...</div>
              ) : activeTab === 'materials' ? (
                <div className="space-y-6">
                  {/* Interactive Video Player */}
                  {activeLesson && activeLesson.videoUrl && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-2">
                      <div className="aspect-video w-full bg-black">
                        {activeLesson.videoUrl.includes('youtube.com') || activeLesson.videoUrl.includes('youtu.be') ? (
                          <iframe
                            src={getYouTubeEmbedUrl(activeLesson.videoUrl)}
                            title="Video Lecture"
                            className="w-full h-full border-0"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            ref={videoRef}
                            src={activeLesson.videoUrl}
                            controls
                            onTimeUpdate={handleTimeUpdate}
                            className="w-full h-full"
                          />
                        )}
                      </div>
                      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-2">
                          <Play className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                          Currently Playing: {activeLesson.title}
                        </span>
                        {lessonProgressMap[activeLesson.id]?.completed && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            COMPLETED (90% Watched)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Lessons List with 90% Completed Status */}
                  {lessons.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/50 space-y-2">
                      <Video className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs font-semibold text-slate-300">No Lessons Uploaded Yet</p>
                      <p className="text-[11px] text-slate-500">Your faculty teacher will upload video lectures and PDF study notes here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Lessons</h4>
                      {lessons.map((lesson, idx) => {
                        const progress = lessonProgressMap[lesson.id];
                        const isCompleted = progress?.completed;

                        return (
                          <div key={lesson.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/20">
                                {idx + 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold text-white">{lesson.title}</p>
                                  {isCompleted && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      COMPLETED
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400">{lesson.description || 'No description provided'}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {lesson.videoUrl && (
                                <button
                                  onClick={() => handleSelectLesson(lesson)}
                                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
                                >
                                  <Play className="w-3.5 h-3.5 fill-white" />
                                  Watch Video
                                </button>
                              )}

                              {lesson.pdfUrl && (
                                <a
                                  href={lesson.pdfUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  PDF Notes
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : activeTab === 'live' ? (
                /* Live Classes Tab */
                <div className="space-y-4">
                  {liveClasses.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/50 space-y-2">
                      <Video className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs font-semibold text-slate-300">No Live Classes Scheduled</p>
                      <p className="text-[11px] text-slate-500">Your faculty teacher will schedule Google Meet or Zoom live class links here.</p>
                    </div>
                  ) : (
                    liveClasses.map((session) => {
                      const scheduledDate = new Date(session.scheduledAt).toLocaleString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div key={session.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{session.title}</span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                SCHEDULED
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Time: {scheduledDate} | Duration: {session.duration} Mins
                            </p>
                          </div>

                          <a
                            href={session.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-600/20"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Join Now
                          </a>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : activeTab === 'tests' ? (
                /* Tests Tab */
                <div className="space-y-4">
                  {courseTests.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/50 space-y-2">
                      <HelpCircle className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs font-semibold text-slate-300">No MCQ Tests Created Yet</p>
                      <p className="text-[11px] text-slate-500">Your faculty teacher will create chapter quizzes and assessment tests here.</p>
                    </div>
                  ) : (
                    courseTests.map((test) => {
                      const lastAttempt = test.lastAttempt;
                      return (
                        <div key={test.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{test.title}</span>
                              {lastAttempt ? (
                                lastAttempt.passed ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                    PASSED ({lastAttempt.score}/{lastAttempt.totalMarks})
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold">
                                    FAILED ({lastAttempt.score}/{lastAttempt.totalMarks})
                                  </span>
                                )
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">
                                  NOT ATTEMPTED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Duration: {test.duration || 30} Mins | Total Marks: {test.totalMarks} | Passing Marks: {test.passingMarks}
                            </p>
                          </div>

                          <button
                            onClick={() => handleStartTest(test)}
                            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            {lastAttempt ? 'Retake Test' : 'Start Test'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* Attendance Tab */
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4 bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Total Sessions</p>
                      <p className="text-xl font-extrabold text-white mt-1">{courseAttendance?.totalSessions || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-emerald-400 uppercase">Present</p>
                      <p className="text-xl font-extrabold text-emerald-400 mt-1">{courseAttendance?.presentSessions || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-red-400 uppercase">Absent</p>
                      <p className="text-xl font-extrabold text-red-400 mt-1">{courseAttendance?.absentSessions || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-400 uppercase">Percentage</p>
                      <p className="text-xl font-extrabold text-blue-400 mt-1">
                        {courseAttendance?.percentage !== null && courseAttendance?.percentage !== undefined
                          ? `${courseAttendance.percentage}%`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {!courseAttendance?.records || courseAttendance.records.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/50 space-y-2">
                      <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs font-semibold text-slate-300">No Attendance Marked Yet</p>
                      <p className="text-[11px] text-slate-500">Your faculty teacher will mark your daily class attendance here.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-800 rounded-xl bg-slate-950 divide-y divide-slate-800/60 overflow-hidden">
                      {courseAttendance.records.map((rec: any) => {
                        const recDate = new Date(rec.date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        });

                        return (
                          <div key={rec.id} className="p-3.5 flex items-center justify-between hover:bg-slate-900/60">
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-xs font-bold text-white">{recDate}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {rec.isPresent ? (
                                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  PRESENT
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1.5">
                                  <XCircle className="w-3.5 h-3.5" />
                                  ABSENT
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCourse(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Test Engine Modal */}
      {activeTest && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{activeTest.title}</h3>
                <p className="text-xs text-slate-400">Duration: {activeTest.duration || 30} Mins | Total Marks: {activeTest.totalMarks}</p>
              </div>
              <button onClick={() => setActiveTest(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            {testResult ? (
              /* Auto-Graded Scorecard */
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-purple-500/10 border border-purple-500/20">
                  {testResult.passed ? (
                    <Award className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-400" />
                  )}
                </div>

                <div>
                  <h4 className="text-2xl font-extrabold text-white">
                    {testResult.passed ? 'Test Passed! 🎉' : 'Test Failed'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Your Score: <span className="text-lg font-bold text-purple-400">{testResult.score} / {testResult.totalMarks}</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 max-w-sm mx-auto flex justify-around text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Status</span>
                    <p className={`font-bold mt-0.5 ${testResult.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                      {testResult.passed ? 'PASSED' : 'FAILED'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Percentage</span>
                    <p className="font-bold text-white mt-0.5">
                      {Math.round((testResult.score / (testResult.totalMarks || 1)) * 100)}%
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTest(null)}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-md"
                >
                  Return to Course Portal
                </button>
              </div>
            ) : (
              /* Questions Checklist */
              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {activeTest.questions?.map((q: any, qIdx: number) => (
                  <div key={q.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-400">Question {qIdx + 1}</span>
                      <span className="text-slate-500">{q.marks || 5} Marks</span>
                    </div>

                    <p className="text-xs font-semibold text-white">{q.question}</p>

                    <div className="space-y-2">
                      {q.options?.map((opt: string, optIdx: number) => (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                            userAnswers[q.id] === optIdx
                              ? 'bg-purple-500/10 border-purple-500/40 text-purple-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={userAnswers[q.id] === optIdx}
                            onChange={() => handleSelectOption(q.id, optIdx)}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500 bg-slate-950"
                          />
                          <span className="text-xs font-medium">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!testResult && (
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitTest}
                  disabled={submittingTest}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-500 hover:from-purple-500 hover:to-emerald-400 text-white text-xs font-bold transition disabled:opacity-50 shadow-md"
                >
                  {submittingTest ? 'Grading Test...' : 'Submit & Grade Test'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
