'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Users, Video, FileText, HelpCircle, LogOut, Search, UserCheck, CheckCircle2, Plus, Calendar, FilePlus, Trash2, Clock, Award, Megaphone, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, Course } from '@/types';

interface QuestionForm {
  question: string;
  options: string[];
  correctAnswer: number;
  marks: number;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [scheduledLiveClasses, setScheduledLiveClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Roster Modal State
  const [selectedCourseForRoster, setSelectedCourseForRoster] = useState<Course | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  // Attendance Sheet Modal State
  const [selectedCourseForAttendance, setSelectedCourseForAttendance] = useState<Course | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<{ [studentId: string]: boolean }>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);

  // Lesson Creation Modal State
  const [selectedCourseForLesson, setSelectedCourseForLesson] = useState<Course | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [submittingLesson, setSubmittingLesson] = useState(false);
  const [lessonSuccess, setLessonSuccess] = useState<string | null>(null);

  // MCQ Test Creation Modal State
  const [selectedCourseForTest, setSelectedCourseForTest] = useState<Course | null>(null);
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [passingMarks, setPassingMarks] = useState<number>(10);
  const [questions, setQuestions] = useState<QuestionForm[]>([
    {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      marks: 5,
    },
  ]);
  const [submittingTest, setSubmittingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  // Live Class Scheduling Modal State
  const [selectedCourseForLiveClass, setSelectedCourseForLiveClass] = useState<Course | null>(null);
  const [liveTitle, setLiveTitle] = useState('');
  const [liveDescription, setLiveDescription] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [liveDuration, setLiveDuration] = useState<number>(60);
  const [submittingLiveClass, setSubmittingLiveClass] = useState(false);
  const [liveClassSuccess, setLiveClassSuccess] = useState<string | null>(null);

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else {
      setCurrentUser(user);
      fetchDashboardData();
    }
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      const [coursesData, announcementsData] = await Promise.all([
        apiFetch<Course[]>('/courses'),
        apiFetch<any[]>('/announcements'),
      ]);
      setAssignedCourses(coursesData);
      setAnnouncements(announcementsData);

      const livePromises = coursesData.map((c) =>
        apiFetch<any[]>(`/courses/${c.id}/live-classes?upcoming=true`).catch(() => []),
      );
      const liveResults = await Promise.all(livePromises);

      const allLive: any[] = [];
      const now = new Date();
      coursesData.forEach((c, idx) => {
        const sessions = liveResults[idx] || [];
        sessions.forEach((s: any) => {
          if (new Date(s.scheduledAt) >= now) {
            allLive.push({ ...s, courseTitle: c.title });
          }
        });
      });
      setScheduledLiveClasses(allLive);
    } catch (e) {
      console.error('Failed to load teacher dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRoster = async (course: Course) => {
    setSelectedCourseForRoster(course);
    setLoadingRoster(true);
    setRosterSearch('');

    try {
      const data = await apiFetch<any[]>(`/courses/${course.id}/enrollments`);
      setEnrolledStudents(data);
    } catch (err: any) {
      console.error('Failed to fetch enrolled student roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleOpenAttendance = async (course: Course) => {
    setSelectedCourseForAttendance(course);
    setAttendanceSuccess(null);
    setLoadingRoster(true);

    try {
      const data = await apiFetch<any[]>(`/courses/${course.id}/enrollments`);
      setEnrolledStudents(data);
      const initialMap: { [id: string]: boolean } = {};
      data.forEach((item) => {
        const sId = item.studentId || item.student?.id || item.id;
        initialMap[sId] = true;
      });
      setAttendanceRecords(initialMap);
    } catch (err: any) {
      console.error('Failed to load students for attendance:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  const toggleAttendanceStatus = (studentId: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedCourseForAttendance) return;
    setSavingAttendance(true);
    setAttendanceSuccess(null);

    const payloadRecords = Object.entries(attendanceRecords).map(([studentId, isPresent]) => ({
      studentId,
      isPresent,
    }));

    try {
      await apiFetch(`/courses/${selectedCourseForAttendance.id}/attendance`, {
        method: 'POST',
        body: JSON.stringify({
          date: attendanceDate,
          records: payloadRecords,
        }),
      });

      setAttendanceSuccess(`Attendance saved for ${attendanceDate}!`);
      setTimeout(() => {
        setSelectedCourseForAttendance(null);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to save attendance.');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForLesson || !lessonTitle) return;
    setSubmittingLesson(true);
    setLessonSuccess(null);

    try {
      await apiFetch(`/courses/${selectedCourseForLesson.id}/lessons`, {
        method: 'POST',
        body: JSON.stringify({
          title: lessonTitle,
          description: lessonDescription || undefined,
          videoUrl: videoUrl || undefined,
          pdfUrl: pdfUrl || undefined,
        }),
      });

      setLessonSuccess(`Lesson "${lessonTitle}" added successfully!`);
      setTimeout(() => {
        setSelectedCourseForLesson(null);
        setLessonTitle('');
        setLessonDescription('');
        setVideoUrl('');
        setPdfUrl('');
        fetchDashboardData();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to add lesson.');
    } finally {
      setSubmittingLesson(false);
    }
  };

  const handleScheduleLiveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForLiveClass || !liveTitle || !meetingLink || !scheduledAt) return;
    setSubmittingLiveClass(true);
    setLiveClassSuccess(null);

    try {
      await apiFetch(`/courses/${selectedCourseForLiveClass.id}/live-classes`, {
        method: 'POST',
        body: JSON.stringify({
          title: liveTitle,
          description: liveDescription || undefined,
          meetingLink,
          scheduledAt,
          duration: Number(liveDuration) || 60,
        }),
      });

      setLiveClassSuccess(`Live Class "${liveTitle}" scheduled successfully!`);
      setTimeout(() => {
        setSelectedCourseForLiveClass(null);
        setLiveTitle('');
        setLiveDescription('');
        setMeetingLink('');
        setScheduledAt('');
        fetchDashboardData();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to schedule live class.');
    } finally {
      setSubmittingLiveClass(false);
    }
  };

  const handleCancelLiveClass = async (courseId: string, liveClassId: string) => {
    if (!confirm('Are you sure you want to cancel this live session?')) return;
    try {
      await apiFetch(`/courses/${courseId}/live-classes/${liveClassId}`, { method: 'DELETE' });
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel live session.');
    }
  };

  const addQuestionForm = () => {
    setQuestions((prev) => [
      ...prev,
      { question: '', options: ['', '', '', ''], correctAnswer: 0, marks: 5 },
    ]);
  };

  const updateQuestionText = (index: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index].question = text;
      return copy;
    });
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const opts = [...copy[qIndex].options];
      opts[optIndex] = text;
      copy[qIndex].options = opts;
      return copy;
    });
  };

  const updateCorrectAnswer = (qIndex: number, correctIdx: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex].correctAnswer = correctIdx;
      return copy;
    });
  };

  const removeQuestion = (qIndex: number) => {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== qIndex));
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForTest || !testTitle) return;
    setSubmittingTest(true);
    setTestSuccess(null);

    const calculatedTotalMarks = questions.reduce((acc, q) => acc + (Number(q.marks) || 1), 0);

    try {
      await apiFetch(`/courses/${selectedCourseForTest.id}/tests`, {
        method: 'POST',
        body: JSON.stringify({
          title: testTitle,
          description: testDescription || undefined,
          duration: Number(duration) || 30,
          totalMarks: calculatedTotalMarks,
          passingMarks: Number(passingMarks) || Math.round(calculatedTotalMarks * 0.5),
          questions: questions.map((q) => ({
            question: q.question,
            options: q.options.filter((o) => o.trim().length > 0),
            correctAnswer: Number(q.correctAnswer),
            marks: Number(q.marks) || 5,
          })),
        }),
      });

      setTestSuccess(`MCQ Test "${testTitle}" created successfully!`);
      setTimeout(() => {
        setSelectedCourseForTest(null);
        setTestTitle('');
        setTestDescription('');
        setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0, marks: 5 }]);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to create MCQ test.');
    } finally {
      setSubmittingTest(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  const filteredRoster = enrolledStudents.filter((item) => {
    const student = item.student || item;
    const name = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
    const email = (student.email || '').toLowerCase();
    const q = rosterSearch.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const totalStudentsAcrossCourses = assignedCourses.reduce(
    (acc, c) => acc + (c._count?.enrollments || 0),
    0,
  );

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
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 font-extrabold flex items-center justify-center text-xs">
              {(currentUser?.institute?.name || 'D')[0]}
            </div>
          )}
          <span className="font-bold text-lg text-white">
            {currentUser?.institute?.name || 'Demo Coaching Academy'}
          </span>
          <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-semibold">
            Teacher Workspace
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Faculty Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Manage video lectures, study notes, schedule live classes, create MCQ tests, and mark attendance.</p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-teal-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Courses</span>
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">{assignedCourses.length}</div>
            <div className="text-xs text-slate-400 mt-1">Active assigned courses</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Enrolled Students</span>
              <Users className="w-5 h-5" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">{totalStudentsAcrossCourses}</div>
            <div className="text-xs text-slate-400 mt-1">Across assigned courses</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Classes</span>
              <Video className="w-5 h-5" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2">{scheduledLiveClasses.length}</div>
            <div className="text-xs text-slate-400 mt-1">Scheduled sessions</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">MCQ Test Engine</span>
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="text-3xl font-extrabold text-amber-400 mt-2">Ready</div>
            <div className="text-xs text-amber-400 mt-1 font-semibold">Timed tests & auto-grading</div>
          </div>
        </div>

        {/* Announcements Banner */}
        {announcements.length > 0 && (
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
              <Megaphone className="w-4 h-4" />
              Institute Announcements Feed
            </div>
            {announcements.slice(0, 2).map((a) => (
              <div key={a.id} className="text-xs text-slate-300">
                <span className="font-bold text-white">{a.title}: </span>
                <span>{a.content}</span>
              </div>
            ))}
          </div>
        )}

        {/* Scheduled Live Classes Section */}
        {scheduledLiveClasses.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-emerald-400" />
                Upcoming Live Class Sessions ({scheduledLiveClasses.length})
              </h2>
              <span className="text-xs text-slate-400">Google Meet & Zoom Sessions</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledLiveClasses.map((session) => {
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
                          {session.courseTitle}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Time: {scheduledDate} | Duration: {session.duration} Mins</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={session.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Start Meeting
                      </a>
                      <button
                        onClick={() => handleCancelLiveClass(session.courseId, session.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                        title="Cancel Live Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Assigned Courses Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-400" />
              Your Assigned Courses
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage lessons, schedule live classes, create MCQ tests, mark attendance, and inspect student rosters</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading your assigned courses...</div>
          ) : assignedCourses.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/50">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No Courses Assigned Yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Your Institute Admin will assign courses to your faculty account.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignedCourses.map((course: any) => {
                const thumb = course.thumbnailUrl || course.thumbnail;
                return (
                  <div key={course.id} className="bg-slate-950 border border-slate-800 hover:border-teal-500/50 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between transition group">
                    {/* Course Thumbnail Image Header */}
                    {thumb ? (
                      <div className="h-36 w-full overflow-hidden bg-slate-900 relative">
                        <img src={thumb} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                      </div>
                    ) : null}

                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            course.isPublished
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {course.isPublished ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-300">
                          {course.price === 0 ? 'FREE' : `₹${course.price.toLocaleString('en-IN')}`}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-teal-400 transition">{course.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{course.description}</p>
                    </div>

                    <div className="p-5 border-t border-slate-800/80 bg-slate-900/40 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span>{course._count?.lessons || 0} Lesson(s)</span>
                        <span className="text-teal-400 font-bold">{course._count?.enrollments || 0} Enrolled</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelectedCourseForLiveClass(course)}
                          className="flex items-center justify-center gap-1 p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold transition"
                        >
                          <Video className="w-3.5 h-3.5 text-emerald-400" />
                          Schedule Live
                        </button>

                        <button
                          onClick={() => handleOpenAttendance(course)}
                          className="flex items-center justify-center gap-1 p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[11px] font-semibold transition"
                        >
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          Attendance
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelectedCourseForLesson(course)}
                          className="flex items-center justify-center gap-1 p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 text-[11px] font-semibold transition"
                        >
                          <Plus className="w-3.5 h-3.5 text-blue-400" />
                          Add Lesson
                        </button>

                        <button
                          onClick={() => setSelectedCourseForTest(course)}
                          className="flex items-center justify-center gap-1 p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-[11px] font-semibold transition"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                          Create Test
                        </button>
                      </div>

                      <button
                        onClick={() => handleOpenRoster(course)}
                        className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      >
                        <Users className="w-3.5 h-3.5 text-teal-400" />
                        View Student Roster ({course._count?.enrollments || 0})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Live Class Modal */}
      {selectedCourseForLiveClass && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Video className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold text-white">Schedule Live Class Session</h3>
                  <p className="text-xs text-slate-400">{selectedCourseForLiveClass.title}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCourseForLiveClass(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            {liveClassSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {liveClassSuccess}
              </div>
            )}

            <form onSubmit={handleScheduleLiveClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Session Title *</label>
                <input
                  type="text"
                  value={liveTitle}
                  onChange={(e) => setLiveTitle(e.target.value)}
                  placeholder="e.g., Live Doubt Clearing Session: Chapter 2"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Meeting Link (Google Meet / Zoom URL) *</label>
                <input
                  type="text"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij or Zoom link"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Minutes) *</label>
                  <input
                    type="number"
                    min={15}
                    value={liveDuration}
                    onChange={(e) => setLiveDuration(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCourseForLiveClass(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLiveClass}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {submittingLiveClass ? 'Scheduling...' : 'Schedule Live Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MCQ Test Creation Modal */}
      {selectedCourseForTest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-purple-400">
                <HelpCircle className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold text-white">Create MCQ Assessment Test</h3>
                  <p className="text-xs text-slate-400">{selectedCourseForTest.title}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCourseForTest(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            {testSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {testSuccess}
              </div>
            )}

            <form onSubmit={handleCreateTest} className="flex-1 overflow-y-auto space-y-6 pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Test Title *</label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="e.g., Chapter 1 MCQ Quiz: Mechanics & Friction"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Time Limit (Minutes) *</label>
                  <input
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Passing Marks *</label>
                  <input
                    type="number"
                    min={1}
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Questions List Builder */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">Multiple-Choice Questions ({questions.length})</h4>
                  <button
                    type="button"
                    onClick={addQuestionForm}
                    className="px-3 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-semibold transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Question
                  </button>
                </div>

                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Question {qIdx + 1}</span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIdx)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                      placeholder={`Enter question ${qIdx + 1} prompt...`}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={q.correctAnswer === optIdx}
                            onChange={() => updateCorrectAnswer(qIdx, optIdx)}
                            className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500 bg-slate-900"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            required
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedCourseForTest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTest}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {submittingTest ? 'Creating Test...' : 'Save MCQ Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Attendance Modal */}
      {selectedCourseForAttendance && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Calendar className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold text-white">Mark Attendance Sheet</h3>
                  <p className="text-xs text-slate-400">{selectedCourseForAttendance.title}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCourseForAttendance(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            {attendanceSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {attendanceSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Attendance Date</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 divide-y divide-slate-800/60 p-2 space-y-1">
              {enrolledStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">No students enrolled in this course.</div>
              ) : (
                enrolledStudents.map((item: any) => {
                  const student = item.student || item;
                  const sId = student.id || item.studentId;
                  const isPresent = attendanceRecords[sId] ?? true;

                  return (
                    <div
                      key={sId}
                      onClick={() => toggleAttendanceStatus(sId)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                        isPresent ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{student.firstName} {student.lastName}</p>
                        <p className="text-[11px] text-slate-400">{student.email}</p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isPresent ? 'bg-emerald-500 text-slate-950' : 'bg-red-500 text-white'
                        }`}
                      >
                        {isPresent ? 'PRESENT' : 'ABSENT'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCourseForAttendance(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={savingAttendance || enrolledStudents.length === 0}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {savingAttendance ? 'Saving Sheet...' : 'Save Attendance Sheet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {selectedCourseForLesson && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-400">
                <FilePlus className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold text-white">Add Lesson & Study Materials</h3>
                  <p className="text-xs text-slate-400">{selectedCourseForLesson.title}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCourseForLesson(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            {lessonSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {lessonSuccess}
              </div>
            )}

            <form onSubmit={handleAddLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Lesson Title *</label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g., Lesson 1: Laws of Motion & Friction"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Lesson Description</label>
                <textarea
                  rows={2}
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  placeholder="Brief overview of the video lecture and PDF study notes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Video Lecture Link (MP4 / YouTube URL)</label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or MP4 URL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">PDF Study Notes Link</label>
                <input
                  type="text"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  placeholder="https://example.com/notes.pdf"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCourseForLesson(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLesson}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {submittingLesson ? 'Adding Lesson...' : 'Save Lesson & Content'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enrolled Students Roster Modal */}
      {selectedCourseForRoster && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-teal-400">
                <Users className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold text-white">Enrolled Student Roster</h3>
                  <p className="text-xs text-slate-400">{selectedCourseForRoster.title}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCourseForRoster(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search enrolled students..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 divide-y divide-slate-800/60 p-2">
              {loadingRoster ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading student roster...</div>
              ) : filteredRoster.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800/80 rounded-xl bg-slate-900/30">
                  <Users className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-300">No Students Enrolled</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    No students have been allocated to this course by your Institute Admin yet.
                  </p>
                </div>
              ) : (
                filteredRoster.map((item: any) => {
                  const student = item.student || item;
                  return (
                    <div key={item.id || student.id} className="p-3 flex items-center justify-between hover:bg-slate-900/60 rounded-lg">
                      <div>
                        <p className="text-xs font-bold text-white">{student.firstName} {student.lastName}</p>
                        <p className="text-[11px] text-slate-400">{student.email}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                        ENROLLED
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCourseForRoster(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
