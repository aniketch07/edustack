'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Users, Video, FileText, HelpCircle, LogOut, Search, UserCheck, CheckCircle2, Plus, Calendar, FilePlus, Trash2, Clock, Award, Megaphone, ExternalLink, Image as ImageIcon, Loader2, X, Sparkles } from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, Course } from '@/types';
import FileUpload from '@/components/FileUpload';
import { useToast } from '@/components/Toast';
import { useAnnouncementToasts } from '@/hooks/useAnnouncementToasts';

interface QuestionForm {
  question: string;
  options: string[];
  correctAnswer: number;
  marks: number;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const toast = useToast();
  useAnnouncementToasts();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Post Announcement State for Teachers
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [selectedCourseForAnnouncement, setSelectedCourseForAnnouncement] = useState('');
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
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
  const [testTotalMarks, setTestTotalMarks] = useState<number>(10);
  const [passingMarks, setPassingMarks] = useState<number>(5);

  // AI Question Generation State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTopics, setAiTopics] = useState('');
  const [aiCount, setAiCount] = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState('mix');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
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
    // Reset stale state so the previous course's roster/records never flash on open
    setEnrolledStudents([]);
    setAttendanceRecords({});
    setLoadingRoster(true);
    const dateStr = new Date().toISOString().split('T')[0];
    setAttendanceDate(dateStr);

    try {
      const [roster, saved] = await Promise.all([
        apiFetch<any[]>(`/courses/${course.id}/enrollments`),
        loadSavedAttendance(course.id, dateStr),
      ]);
      setEnrolledStudents(roster);
      const initialMap: { [id: string]: boolean } = {};
      // Pre-fill from saved attendance for this date so previously marked records show
      saved.forEach((rec) => {
        if (rec.studentId) initialMap[rec.studentId] = rec.isPresent;
      });
      // Default students with no saved record to Present
      roster.forEach((item) => {
        const sId = item.studentId || item.student?.id || item.id;
        if (initialMap[sId] === undefined) initialMap[sId] = true;
      });
      setAttendanceRecords(initialMap);
    } catch (err: any) {
      console.error('Failed to load students for attendance:', err);
      setEnrolledStudents([]);
    } finally {
      setLoadingRoster(false);
    }
  };

  const loadSavedAttendance = async (courseId: string, date: string): Promise<any[]> => {
    try {
      const saved = await apiFetch<any[]>(`/courses/${courseId}/attendance?date=${date}`);
      return saved || [];
    } catch {
      return [];
    }
  };

  const handleAttendanceDateChange = async (date: string) => {
    setAttendanceDate(date);
    if (!selectedCourseForAttendance) return;
    setLoadingRoster(true);
    try {
      const saved = await loadSavedAttendance(selectedCourseForAttendance.id, date);
      setAttendanceRecords((prev) => {
        const next: { [id: string]: boolean } = { ...prev };
        saved.forEach((rec) => {
          if (rec.studentId) next[rec.studentId] = rec.isPresent;
        });
        return next;
      });
    } catch (err) {
      console.error('Failed to load attendance for date:', err);
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

  // Distribute total marks evenly across all questions, always summing exactly to total
  const distributeMarks = (total: number, count: number): number[] => {
    if (count <= 0) return [];
    const base = Math.floor(total / count);
    const remainder = total % count;
    return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
  };

  const reapplyMarks = (qs: QuestionForm[], total: number): QuestionForm[] => {
    const marks = distributeMarks(total, qs.length);
    return qs.map((q, i) => ({ ...q, marks: marks[i] }));
  };

  const addQuestionForm = () => {
    setQuestions((prev) =>
      reapplyMarks([...prev, { question: '', options: ['', '', '', ''], correctAnswer: 0, marks: 1 }], testTotalMarks),
    );
  };

  const handleTotalMarksChange = (value: number) => {
    const v = Number(value) || 1;
    setTestTotalMarks(v);
    setQuestions((prev) => reapplyMarks(prev, v));
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
    setQuestions((prev) => reapplyMarks(prev.filter((_, i) => i !== qIndex), testTotalMarks));
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForTest || !testTitle) return;
    setSubmittingTest(true);
    setTestSuccess(null);

    // Skip empty/unfilled question rows (no text or no valid options)
    const finalQuestions = reapplyMarks(questions, testTotalMarks).filter((q) => {
      const hasText = q.question.trim().length > 0;
      const validOptions = q.options.filter((o) => o.trim().length > 0).length;
      return hasText && validOptions >= 2;
    });
    if (finalQuestions.length === 0) {
      setTestSuccess(null);
      alert('Add at least one question with a question and at least 2 options.');
      setSubmittingTest(false);
      return;
    }
    const totalForSend = finalQuestions.reduce((acc, q) => acc + (Number(q.marks) || 1), 0);

    // Clamp passing marks so it can never exceed the total achievable marks
    const requestedPassing = Number(passingMarks) || Math.round(totalForSend * 0.5);
    const safePassingMarks = Math.min(Math.max(requestedPassing, 1), totalForSend);

    try {
      await apiFetch(`/courses/${selectedCourseForTest.id}/tests`, {
        method: 'POST',
        body: JSON.stringify({
          title: testTitle,
          description: testDescription || undefined,
          duration: Number(duration) || 30,
          totalMarks: totalForSend,
          passingMarks: safePassingMarks,
          questions: finalQuestions.map((q) => ({
            question: q.question,
            options: q.options.filter((o) => o.trim().length > 0),
            correctAnswer: Number(q.correctAnswer),
            marks: Number(q.marks) || 1,
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

  const handleOpenLessonModal = (course: Course) => {
    setLessonSuccess(null);
    setSelectedCourseForLesson(course);
  };

  const handleOpenTestModal = (course: Course) => {
    setTestSuccess(null);
    setTestTitle('');
    setTestDescription('');
    setTestTotalMarks(10);
    setPassingMarks(5);
    setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0, marks: 10 }]);
    setShowAiPanel(false);
    setAiTopics('');
    setAiCount(10);
    setAiDifficulty('mix');
    setAiError(null);
    setSelectedCourseForTest(course);
  };

  const handleAiGenerate = async () => {
    if (!aiTopics.trim()) {
      setAiError('Please enter topics for the AI to generate questions on.');
      return;
    }
    setGenerating(true);
    setAiError(null);
    try {
      const res = await apiFetch<{ questions: Array<{ question: string; options: string[]; correctAnswer: number; explanation?: string }> }>(
        '/ai/generate-mcq',
        {
          method: 'POST',
          body: JSON.stringify({ topics: aiTopics, count: aiCount, difficulty: aiDifficulty }),
        },
      );
      const gen = res.questions || [];
      if (gen.length === 0) {
        setAiError('AI returned no questions. Try again.');
        return;
      }
      // Append generated questions, replacing the untouched empty placeholder
      // question so we don't end up with a blank row at the top.
      setQuestions((prev) => {
        const firstIsPlaceholder =
          prev.length > 0 &&
          !prev[0].question.trim() &&
          prev[0].options.every((o) => !o.trim());
        const base = firstIsPlaceholder ? prev.slice(1) : prev;
        return [
          ...base,
          ...gen.map((q) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            marks: 1,
          })),
        ];
      });
      setShowAiPanel(false);
    } catch (err: any) {
      // AI unavailable — fall back to manual editing instead of blocking the teacher
      setShowAiPanel(false);
      setAiError(null);
      toast.info('AI generation is temporarily unavailable. Add your questions manually below.');
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenLiveClassModal = (course: Course) => {
    setLiveClassSuccess(null);
    setSelectedCourseForLiveClass(course);
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

  const handlePostTeacherAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle || !announcementContent || !selectedCourseForAnnouncement) return;
    setSubmittingAnnouncement(true);
    try {
      await apiFetch('/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: announcementTitle,
          content: announcementContent,
          courseId: selectedCourseForAnnouncement,
        }),
      });
      const updatedAnn = await apiFetch<any[]>('/announcements');
      setAnnouncements(updatedAnn);
      setShowAnnouncementModal(false);
      setAnnouncementTitle('');
      setAnnouncementContent('');
      setSelectedCourseForAnnouncement('');
    } catch (err: any) {
      alert(err.message || 'Failed to post announcement.');
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const instLogo = currentUser?.institute?.logoUrl;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center text-xs gap-3">
        <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
        <span>Loading faculty workspace...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Header Bar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
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
          <span className="font-bold text-base sm:text-lg text-white tracking-tight">
            {currentUser?.institute?.name || 'Faculty Workspace'}
          </span>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-semibold">
            Teacher Workspace
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs sm:text-sm font-semibold text-white">
              {currentUser?.firstName} {currentUser?.lastName}
            </p>
            <p className="text-[11px] text-slate-400">{currentUser?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Title & Refresh Control */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Faculty Dashboard</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Manage video lectures, study notes, schedule live sessions, build MCQ tests, and track attendance.
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all active:scale-95 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span>Refresh Workspace</span>
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-teal-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between text-teal-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Courses</span>
              <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{assignedCourses.length}</div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Active assigned courses</div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Enrolled Students</span>
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{totalStudentsAcrossCourses}</div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Across assigned courses</div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Classes</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <Video className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-400 mt-3">{scheduledLiveClasses.length}</div>
            <div className="text-xs text-slate-400 mt-2 font-medium">Scheduled sessions</div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-lg shadow-black/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">MCQ Test Engine</span>
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                <HelpCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-400 mt-3">Ready</div>
            <div className="text-xs text-amber-400 mt-2 font-semibold">Timed tests & auto-grading</div>
          </div>
        </div>

        {/* Announcements Banner */}
        <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
              <Megaphone className="w-4 h-4" />
              Announcements Feed
            </div>

            {assignedCourses.length > 0 && (
              <button
                onClick={() => setShowAnnouncementModal(true)}
                className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Post Course Announcement
              </button>
            )}
          </div>

          {announcements.length === 0 ? (
            <p className="text-xs text-slate-400">No announcements published yet.</p>
          ) : (
            <div className="space-y-2">
              {announcements.slice(0, 3).map((a) => (
                <div key={a.id} className="text-xs text-slate-300 flex items-start gap-2">
                  {a.course ? (
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold shrink-0">
                      {a.course.title}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-bold shrink-0">
                      Institute Wide
                    </span>
                  )}
                  <div>
                    <span className="font-bold text-white">{a.title}: </span>
                    <span>{a.content}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
                  <div
                    key={course.id}
                    onClick={() => router.push(`/courses/${course.id}`)}
                    className="bg-slate-950 border border-slate-800 hover:border-teal-500/50 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between transition group cursor-pointer"
                  >
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
                          {(course.price ?? 0) === 0 ? 'FREE' : `₹${(course.price ?? 0).toLocaleString('en-IN')}`}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-teal-400 transition">{course.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{course.description}</p>
                    </div>

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="p-5 border-t border-slate-800/80 bg-slate-900/40 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span>{course._count?.lessons || 0} Lesson(s)</span>
                        <span className="text-teal-400 font-bold">{course._count?.enrollments || 0} Enrolled</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenLiveClassModal(course);
                          }}
                          className="flex items-center justify-center gap-1 p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold transition cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5 text-emerald-400" />
                          Schedule Live
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAttendance(course);
                          }}
                          className="flex items-center justify-center gap-1 p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[11px] font-semibold transition cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          Attendance
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenLessonModal(course);
                          }}
                          className="flex items-center justify-center gap-1 p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 text-[11px] font-semibold transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-blue-400" />
                          Add Lesson
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/teacher/courses/${course.id}/tests`);
                          }}
                          className="flex items-center justify-center gap-1 p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-[11px] font-semibold transition cursor-pointer"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                          Create Test
                        </button>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRoster(course);
                        }}
                        className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Video className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold text-white">Schedule Live Class Session</h3>
                  <p className="text-xs text-slate-400">{selectedCourseForLiveClass.title}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCourseForLiveClass(null)}
                className="text-slate-400 hover:text-white p-1 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {liveClassSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>{liveClassSuccess}</span>
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
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCourseForLiveClass(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLiveClass}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submittingLiveClass ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <span>Schedule Live Session</span>
                  )}
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
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-4">
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

                {/* Two-Path Question Entry: Generate with AI OR Add Manually */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    How do you want to add questions?
                  </label>
                  {!showAiPanel ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAiPanel(true)}
                        className="p-3.5 rounded-2xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-left transition cursor-pointer"
                      >
                        <span className="text-sm font-bold text-purple-300">✨ Generate with AI</span>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Enter topics &amp; count — AI writes the questions for you.
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAiPanel(false)}
                        className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950 hover:border-slate-700 text-left transition cursor-pointer"
                      >
                        <span className="text-sm font-bold text-white">✍️ Add Manually</span>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Write each question yourself below.
                        </p>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300">✨ AI Question Generator</span>
                        <button
                          type="button"
                          onClick={() => { setShowAiPanel(false); setAiError(null); }}
                          className="text-[11px] text-slate-400 hover:text-white transition"
                        >
                          ✕ Back to manual
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Topics (comma-separated) *</label>
                        <input
                          type="text"
                          value={aiTopics}
                          onChange={(e) => setAiTopics(e.target.value)}
                          placeholder="e.g., Newton Laws of Motion, Kinematics, Friction"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Number of Questions</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={aiCount}
                            onChange={(e) => setAiCount(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
                          <select
                            value={aiDifficulty}
                            onChange={(e) => setAiDifficulty(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                          >
                            <option value="mix">Mixed</option>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                      </div>

                      {aiError && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                          {aiError}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleAiGenerate}
                        disabled={generating}
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-60 cursor-pointer"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating {aiCount} questions...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate Questions
                          </>
                        )}
                      </button>
                      <p className="text-[10px] text-slate-500">
                        AI questions are added below for your review — edit or remove before publishing.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Total Marks *</label>
                  <input
                    type="number"
                    min={1}
                    value={testTotalMarks}
                    onChange={(e) => handleTotalMarksChange(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Time Limit (Min) *</label>
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
                    max={testTotalMarks}
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="sm:col-span-4">
                  <p className="text-[11px] text-slate-400">
                    💡 Marks are <span className="text-purple-400 font-semibold">auto-distributed evenly</span> across questions.
                    Currently <span className="text-white font-semibold">{questions.length} question(s)</span> →{' '}
                    <span className="text-white font-semibold">
                      {distributeMarks(testTotalMarks, questions.length).join(' / ')} marks each
                    </span>.
                  </p>
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
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        Question {qIdx + 1}
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">
                          {q.marks} Marks
                        </span>
                      </span>
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
                onChange={(e) => handleAttendanceDateChange(e.target.value)}
                disabled={loadingRoster}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 divide-y divide-slate-800/60 p-2 space-y-1">
              {loadingRoster ? (
                <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>Loading attendance roster...</span>
                </div>
              ) : enrolledStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">No students enrolled in this course.</div>
              ) : (
                enrolledStudents.map((item: any) => {
                  const student = item.student || item;
                  const sId = student.id || item.studentId;
                  const isPresent = attendanceRecords[sId] ?? false;

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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Video Lecture</label>
                <FileUpload
                  folder="lessons"
                  accept="video/mp4,video/webm"
                  label=""
                  description="Upload MP4 / WebM video — max 500 MB"
                  onUploadComplete={(publicUrl) => setVideoUrl(publicUrl)}
                />
                {videoUrl && (
                  <p className="mt-1.5 text-[11px] text-emerald-400 font-medium">
                    ✓ Video uploaded successfully
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">PDF Study Notes</label>
                <FileUpload
                  folder="lessons"
                  accept="application/pdf"
                  label=""
                  description="Upload PDF notes — max 50 MB"
                  onUploadComplete={(publicUrl) => setPdfUrl(publicUrl)}
                />
                {pdfUrl && (
                  <p className="mt-1.5 text-[11px] text-emerald-400 font-medium">
                    ✓ PDF uploaded successfully
                  </p>
                )}
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

      {/* Post Course Announcement Modal for Teachers */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Post Course Announcement</h3>
              <button onClick={() => setShowAnnouncementModal(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handlePostTeacherAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Assigned Course *</label>
                <select
                  value={selectedCourseForAnnouncement}
                  onChange={(e) => setSelectedCourseForAnnouncement(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">-- Select Course --</option>
                  {assignedCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Announcement Title *</label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="e.g., Important Exam Prep Guidance"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Announcement Content *</label>
                <textarea
                  rows={4}
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="Type your course update or announcement for enrolled students..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingAnnouncement}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-500/20 disabled:opacity-50 cursor-pointer"
              >
                {submittingAnnouncement ? 'Publishing...' : 'Publish Course Announcement'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
