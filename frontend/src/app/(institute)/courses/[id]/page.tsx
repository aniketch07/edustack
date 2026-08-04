'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  Video,
  FileText,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Play,
  Download,
  Trash2,
  ExternalLink,
  Award,
  UserCheck,
  Search,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Layers,
  ChevronRight,
  Send,
  HelpCircle,
  BarChart3,
  Lock,
  Loader2,
} from 'lucide-react';
import { getUser, getToken, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, Course, UserRole } from '@/types';
import FileUpload from '@/components/FileUpload';
import { useToast } from '@/components/Toast';

type TabType = 'overview' | 'lessons' | 'live-classes' | 'tests' | 'attendance';

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const searchParams = useSearchParams();
  const courseId = params?.id as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get('tab') as TabType) || 'overview'
  );

  // Tab Data States
  const [teachers, setTeachers] = useState<User[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Course Announcement State
  const [showPostAnnouncementModal, setShowPostAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);

  // Overview / Roster State
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [allocating, setAllocating] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  // Lesson Upload State
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [submittingLesson, setSubmittingLesson] = useState(false);
  const [activeVideoLesson, setActiveVideoLesson] = useState<any | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Live Class State
  const [showScheduleLiveModal, setShowScheduleLiveModal] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [liveDescription, setLiveDescription] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [liveDuration, setLiveDuration] = useState('60');
  const [submittingLive, setSubmittingLive] = useState(false);

  // MCQ Test State
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testDuration, setTestDuration] = useState('30');
  const [testPassingMarks, setTestPassingMarks] = useState('40');
  const [questions, setQuestions] = useState<
    Array<{ question: string; options: string[]; correctAnswer: number; marks: number }>
  >([
    { question: '', options: ['', '', '', ''], correctAnswer: 0, marks: 1 },
  ]);
  const [submittingTest, setSubmittingTest] = useState(false);
  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // AI Question Generation State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTopics, setAiTopics] = useState('');
  const [aiCount, setAiCount] = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState('mix');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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

  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else {
      setCurrentUser(user);
      if (courseId) fetchCourseData(user);
    }
  }, [courseId, router]);

  const fetchCourseData = async (userObj: User) => {
    try {
      const courseData = await apiFetch<Course>(`/courses/${courseId}`);
      setCourse(courseData);
      setSelectedTeacherId(courseData.teacherId || courseData.teacher?.id || '');

      // Load sub-module content
      const [lessonsData, liveData, testsData, enrollmentsData, announcementsData] = await Promise.all([
        apiFetch<any[]>(`/courses/${courseId}/lessons`).catch(() => []),
        apiFetch<any[]>(`/courses/${courseId}/live-classes`).catch(() => []),
        apiFetch<any[]>(`/courses/${courseId}/tests`).catch(() => []),
        apiFetch<any[]>(`/courses/${courseId}/enrollments`).catch(() => []),
        apiFetch<any[]>(`/announcements?courseId=${courseId}`).catch(() => []),
      ]);

      setLessons(lessonsData);
      setLiveClasses(liveData);
      setTests(testsData);
      setEnrolledStudents(enrollmentsData);
      setAnnouncements(announcementsData);
      const enrolledIds = enrollmentsData.map((e) => e.studentId || e.student?.id);
      setSelectedStudentIds(enrolledIds.filter(Boolean));

      // Admin metadata fetching
      if (userObj.role === UserRole.SUPER_ADMIN || userObj.role === UserRole.INSTITUTE_ADMIN) {
        const [teachersData, studentsData] = await Promise.all([
          apiFetch<User[]>('/users?role=TEACHER').catch(() => []),
          apiFetch<User[]>('/users?role=STUDENT').catch(() => []),
        ]);
        setTeachers(teachersData);
        setAllStudents(studentsData);
      }

      // Student specific attendance
      if (userObj.role === UserRole.STUDENT) {
        const myAtt = await apiFetch<any[]>(
          `/students/me/attendance?courseId=${courseId}`
        ).catch(() => []);
        setStudentAttendance(myAtt);
      }
    } catch (e) {
      console.error('Failed to load course details:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load Attendance records for a specific date
  useEffect(() => {
    if (
      courseId &&
      (currentUser?.role === UserRole.SUPER_ADMIN ||
        currentUser?.role === UserRole.INSTITUTE_ADMIN ||
        currentUser?.role === UserRole.TEACHER)
    ) {
      fetchAttendanceForDate(attendanceDate);
    }
  }, [attendanceDate, courseId, currentUser]);

  const fetchAttendanceForDate = async (dateStr: string) => {
    try {
      const records = await apiFetch<any[]>(
        `/courses/${courseId}/attendance?date=${dateStr}`
      );
      setAttendanceRecords(records);
      const map: Record<string, boolean> = {};
      records.forEach((r) => {
        const sId = r.studentId || r.student?.id;
        if (sId) map[sId] = r.isPresent;
      });
      setAttendanceMap(map);
    } catch (e) {
      setAttendanceRecords([]);
      setAttendanceMap({});
    }
  };

  const handleAssignTeacher = async (tId: string) => {
    try {
      await apiFetch(`/courses/${courseId}`, {
        method: 'PATCH',
        body: JSON.stringify({ teacherId: tId || null }),
      });
      setSelectedTeacherId(tId);
      if (course) {
        const matchedT = teachers.find((t) => t.id === tId);
        setCourse({
          ...course,
          teacherId: tId,
          teacher: matchedT ? { id: matchedT.id, firstName: matchedT.firstName, lastName: matchedT.lastName, email: matchedT.email } : undefined,
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to assign teacher.');
    }
  };

  const handleSaveStudentAllocations = async () => {
    setAllocating(true);
    try {
      await apiFetch(`/courses/${courseId}/enrollments`, {
        method: 'POST',
        body: JSON.stringify({ studentIds: selectedStudentIds }),
      });
      const updatedEnrollments = await apiFetch<any[]>(`/courses/${courseId}/enrollments`);
      setEnrolledStudents(updatedEnrollments);
      setShowAllocateModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save student allocations.');
    } finally {
      setAllocating(false);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle || !announcementContent) return;
    setSubmittingAnnouncement(true);
    try {
      await apiFetch('/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: announcementTitle,
          content: announcementContent,
          courseId,
        }),
      });
      const updatedAnn = await apiFetch<any[]>(`/announcements?courseId=${courseId}`);
      setAnnouncements(updatedAnn);
      setShowPostAnnouncementModal(false);
      setAnnouncementTitle('');
      setAnnouncementContent('');
    } catch (err: any) {
      alert(err.message || 'Failed to post course announcement.');
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle) return;
    setSubmittingLesson(true);
    try {
      await apiFetch(`/courses/${courseId}/lessons`, {
        method: 'POST',
        body: JSON.stringify({
          title: lessonTitle,
          description: lessonDescription || undefined,
          videoUrl: videoUrl || undefined,
          pdfUrl: pdfUrl || undefined,
        }),
      });
      const updatedLessons = await apiFetch<any[]>(`/courses/${courseId}/lessons`);
      setLessons(updatedLessons);
      setShowAddLessonModal(false);
      setLessonTitle('');
      setLessonDescription('');
      setVideoUrl('');
      setPdfUrl('');
    } catch (err: any) {
      alert(err.message || 'Failed to add lesson.');
    } finally {
      setSubmittingLesson(false);
    }
  };

  const handleDownloadPdf = async (lessonId: string) => {
    try {
      const token = getToken();
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${baseUrl}/lessons/${lessonId}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'study-notes.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download PDF.');
    }
  };

  const handleScheduleLiveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveTitle || !meetingLink || !scheduledAt) return;
    setSubmittingLive(true);
    try {
      await apiFetch(`/courses/${courseId}/live-classes`, {
        method: 'POST',
        body: JSON.stringify({
          title: liveTitle,
          description: liveDescription || undefined,
          meetingLink,
          scheduledAt,
          duration: Number(liveDuration) || 60,
        }),
      });
      const updatedLive = await apiFetch<any[]>(`/courses/${courseId}/live-classes`);
      setLiveClasses(updatedLive);
      setShowScheduleLiveModal(false);
      setLiveTitle('');
      setLiveDescription('');
      setMeetingLink('');
      setScheduledAt('');
    } catch (err: any) {
      alert(err.message || 'Failed to schedule live class.');
    } finally {
      setSubmittingLive(false);
    }
  };

  const handleDeleteLiveClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this live class session?')) return;
    try {
      await apiFetch(`/courses/${courseId}/live-classes/${id}`, { method: 'DELETE' });
      setLiveClasses((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete live class.');
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTitle) return;
    setSubmittingTest(true);
    try {
      // Skip empty/unfilled question rows (no text or no valid options)
      const formattedQuestions = questions
        .filter((q) => {
          const hasText = q.question.trim().length > 0;
          const validOptions = q.options.filter((o) => o && o.trim().length > 0).length;
          return hasText && validOptions >= 2;
        })
        .map((q) => ({
          question: q.question,
          options: q.options.filter((o) => o && o.trim().length > 0),
          correctAnswer: q.correctAnswer,
          marks: Number(q.marks) || 1,
        }));
      if (formattedQuestions.length === 0) {
        setSubmittingTest(false);
        alert('Add at least one question with a question and at least 2 options.');
        return;
      }

      // Total marks = sum of each question's marks (backend requires a positive integer)
      const computedTotalMarks = formattedQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
      const safePassingMarks = Math.min(
        Math.max(Number(testPassingMarks) || 40, 1),
        computedTotalMarks,
      );

      await apiFetch(`/courses/${courseId}/tests`, {
        method: 'POST',
        body: JSON.stringify({
          title: testTitle,
          description: testDescription || undefined,
          duration: Number(testDuration) || 30,
          totalMarks: computedTotalMarks,
          passingMarks: safePassingMarks,
          questions: formattedQuestions,
        }),
      });

      const updatedTests = await apiFetch<any[]>(`/courses/${courseId}/tests`);
      setTests(updatedTests);
      setShowCreateTestModal(false);
      setTestTitle('');
      setTestDescription('');
      setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0, marks: 1 }]);
    } catch (err: any) {
      alert(err.message || 'Failed to create test.');
    } finally {
      setSubmittingTest(false);
    }
  };

  const handleSubmitTestAttempt = async () => {
    if (!activeTest) return;
    setSubmittingAttempt(true);
    try {
      const res = await apiFetch<any>(`/tests/${activeTest.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: userAnswers }),
      });
      setTestResult(res.attempt || res);
      const updatedTests = await apiFetch<any[]>(`/courses/${courseId}/tests`);
      setTests(updatedTests);
    } catch (err: any) {
      alert(err.message || 'Failed to submit test attempt.');
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    setAttendanceSuccess(null);
    try {
      const recordsPayload = enrolledStudents.map((e) => {
        const sId = e.studentId || e.student?.id;
        return {
          studentId: sId,
          isPresent: attendanceMap[sId] ?? false,
        };
      });

      await apiFetch(`/courses/${courseId}/attendance`, {
        method: 'POST',
        body: JSON.stringify({
          date: attendanceDate,
          records: recordsPayload,
        }),
      });

      setAttendanceSuccess(`Attendance saved for ${attendanceDate}!`);
      setTimeout(() => setAttendanceSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save attendance.');
    } finally {
      setSavingAttendance(false);
    }
  };

  const isStaff =
    currentUser?.role === UserRole.SUPER_ADMIN ||
    currentUser?.role === UserRole.INSTITUTE_ADMIN ||
    currentUser?.role === UserRole.TEACHER;

  const filteredRoster = enrolledStudents.filter((e) => {
    const s = e.student || e;
    const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    const email = (s.email || '').toLowerCase();
    return name.includes(rosterSearch.toLowerCase()) || email.includes(rosterSearch.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center text-xs gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <p className="font-semibold text-slate-300">Loading Course Module...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center text-xs gap-3">
        <BookOpen className="w-10 h-10 text-slate-600" />
        <p className="font-bold text-slate-200">Course Not Found</p>
        <Link href="/courses" className="text-blue-400 hover:underline">
          Return to Courses Roster
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header & Breadcrumb Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 hidden sm:inline">Courses</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:inline" />
            <span className="font-bold text-white max-w-[200px] sm:max-w-xs truncate">
              {course.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            {currentUser?.role?.replace('_', ' ')}
          </span>
        </div>
      </header>

      {/* Main Course Workspace Layout with Left Navigation Panel */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Left Side Navigation Panel */}
        <aside className="w-full lg:w-72 shrink-0 space-y-4">
          {/* Course Hero Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            {(course.thumbnailUrl || course.thumbnail) ? (
              <img
                src={course.thumbnailUrl || course.thumbnail || ''}
                alt={course.title}
                className="w-full h-32 rounded-xl object-cover border border-slate-800"
              />
            ) : (
              <div className="w-full h-28 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-slate-800 flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-blue-400/80" />
              </div>
            )}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                    course.isPublished
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  {course.isPublished ? 'PUBLISHED' : 'DRAFT'}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {(course.price ?? 0) === 0 ? 'FREE' : `₹${(course.price ?? 0).toLocaleString('en-IN')}`}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white leading-snug">{course.title}</h2>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {course.description}
              </p>
            </div>
          </div>

          {/* Left Navigation Buttons */}
          <nav className="bg-slate-900 border border-slate-800 rounded-2xl p-2 space-y-1 shadow-xl">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Overview & Roster</span>
            </button>

            <button
              onClick={() => setActiveTab('lessons')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'lessons'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4" />
                <span>Lessons & Materials</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-950/60 border border-slate-800 text-[10px] font-bold">
                {lessons.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('live-classes')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'live-classes'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Video className="w-4 h-4" />
                <span>Live Classes</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-950/60 border border-slate-800 text-[10px] font-bold">
                {liveClasses.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('tests')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'tests'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Award className="w-4 h-4" />
                <span>MCQ Tests</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-950/60 border border-slate-800 text-[10px] font-bold">
                {tests.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Attendance Register</span>
            </button>
          </nav>

          {/* Sidebar Quick Summary Widget */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs">
            <h4 className="font-bold text-slate-300 uppercase text-[10px] tracking-wider mb-2">
              Course Quick Stats
            </h4>
            <div className="flex items-center justify-between text-slate-400 py-1 border-b border-slate-800/40">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" /> Enrolled Students
              </span>
              <span className="font-bold text-white">{enrolledStudents.length}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 py-1 border-b border-slate-800/40">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" /> Total Lessons
              </span>
              <span className="font-bold text-white">{lessons.length}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 py-1 border-b border-slate-800/40">
              <span className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-rose-400" /> Live Sessions
              </span>
              <span className="font-bold text-white">{liveClasses.length}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 py-1">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" /> MCQ Tests
              </span>
              <span className="font-bold text-white">{tests.length}</span>
            </div>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="flex-1 min-w-0">
          {/* TAB 1: OVERVIEW & ROSTER */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Assigned Teacher Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-teal-400" />
                    <h3 className="text-sm font-bold text-white">Assigned Faculty Staff</h3>
                  </div>
                  {isStaff && (
                    <span className="text-[10px] text-slate-400">
                      Instructor in charge of course delivery
                    </span>
                  )}
                </div>

                {currentUser?.role === UserRole.SUPER_ADMIN ||
                currentUser?.role === UserRole.INSTITUTE_ADMIN ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-sm shrink-0">
                      {course.teacher?.firstName?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Select Assigned Instructor
                      </label>
                      <select
                        value={selectedTeacherId}
                        onChange={(e) => handleAssignTeacher(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-teal-500 cursor-pointer"
                      >
                        <option value="">-- No Teacher Assigned --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.firstName} {t.lastName} ({t.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-sm">
                      {course.teacher?.firstName?.[0] || '?'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {course.teacher
                          ? `${course.teacher.firstName || ''} ${course.teacher.lastName || ''}`.trim()
                          : 'No Teacher Assigned Yet'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {course.teacher?.email || 'Contact institute admin for assignment'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Course Announcements Section */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">Course Announcements ({announcements.length})</h3>
                  </div>
                  {isStaff && (
                    <button
                      onClick={() => setShowPostAnnouncementModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Post Course Announcement
                    </button>
                  )}
                </div>

                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">
                    No announcements published for this course yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((ann) => (
                      <div key={ann.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white">{ann.title}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(ann.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{ann.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Enrolled Students Roster */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">
                      Enrolled Students Roster ({enrolledStudents.length})
                    </h3>
                  </div>

                  {(currentUser?.role === UserRole.SUPER_ADMIN ||
                    currentUser?.role === UserRole.INSTITUTE_ADMIN) && (
                    <button
                      onClick={() => setShowAllocateModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Set Allocated Students
                    </button>
                  )}
                </div>

                {/* Search input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search enrolled students..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {filteredRoster.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No enrolled students found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Email Address</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {filteredRoster.map((item) => {
                          const s = item.student || item;
                          return (
                            <tr key={s.id || item.id} className="hover:bg-slate-800/40 transition">
                              <td className="py-3 px-3 font-semibold text-white">
                                {s.firstName} {s.lastName}
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-400">
                                {s.email}
                              </td>
                              <td className="py-3 px-3 text-slate-400">{s.phone || '—'}</td>
                              <td className="py-3 px-3 text-right">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                  ENROLLED
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LESSONS & MATERIALS */}
          {activeTab === 'lessons' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Course Lessons & Materials</h3>
                  <p className="text-xs text-slate-400">
                    Video lectures and downloadable PDF study notes
                  </p>
                </div>

                {isStaff && (
                  <button
                    onClick={() => setShowAddLessonModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Lesson
                  </button>
                )}
              </div>

              {/* Active Video Player View */}
              {activeVideoLesson && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Play className="w-4 h-4 text-blue-400 fill-blue-400" />
                      Now Playing: {activeVideoLesson.title}
                    </h4>
                    <button
                      onClick={() => setActiveVideoLesson(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Close Player ✕
                    </button>
                  </div>

                  <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
                    <video
                      ref={videoRef}
                      src={activeVideoLesson.videoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeVideoLesson.description}
                  </p>
                </div>
              )}

              {/* Lessons List */}
              {lessons.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs space-y-3">
                  <FileText className="w-10 h-10 mx-auto text-slate-700" />
                  <p className="font-semibold text-slate-400">No lessons uploaded yet.</p>
                  {isStaff && (
                    <p className="text-slate-500">
                      Click &quot;Add Lesson&quot; above to upload video lectures and study notes.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {lessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{lesson.title}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">{lesson.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                            {lesson.videoUrl && (
                              <span className="flex items-center gap-1 text-blue-400">
                                <Video className="w-3 h-3" /> Video Included
                              </span>
                            )}
                            {lesson.pdfUrl && (
                              <span className="flex items-center gap-1 text-purple-400">
                                <FileText className="w-3 h-3" /> PDF Notes
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                        {lesson.videoUrl && (
                          <button
                            onClick={() => setActiveVideoLesson(lesson)}
                            className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            Watch Lecture
                          </button>
                        )}
                        {lesson.pdfUrl && (
                          <button
                            onClick={() => handleDownloadPdf(lesson.id)}
                            className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            PDF Notes
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIVE CLASSES */}
          {activeTab === 'live-classes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Interactive Live Classes</h3>
                  <p className="text-xs text-slate-400">
                    Scheduled virtual classrooms and lecture links
                  </p>
                </div>

                {isStaff && (
                  <button
                    onClick={() => setShowScheduleLiveModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Schedule Live Session
                  </button>
                )}
              </div>

              {liveClasses.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs space-y-3">
                  <Video className="w-10 h-10 mx-auto text-slate-700" />
                  <p className="font-semibold text-slate-400">No live classes scheduled.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {liveClasses.map((lc) => (
                    <div
                      key={lc.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            LIVE SESSION
                          </span>
                          <h4 className="text-sm font-bold text-white">{lc.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {lc.description || 'No description provided.'}
                          </p>
                        </div>

                        {isStaff && (
                          <button
                            onClick={() => handleDeleteLiveClass(lc.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                            title="Delete Session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-300 pt-2 border-t border-slate-800/60">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {new Date(lc.scheduledAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{lc.duration || 60} mins</span>
                        </div>
                      </div>

                      <a
                        href={lc.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-500/20"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Join Classroom Now
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MCQ TESTS */}
          {activeTab === 'tests' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">MCQ Assessments & Tests</h3>
                  <p className="text-xs text-slate-400">
                    Online multiple-choice quizzes with instant evaluation
                  </p>
                </div>

                {isStaff && (
                  <button
                    onClick={() => router.push(`/teacher/courses/${courseId}/tests`)}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-purple-500/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Create & Manage MCQ Tests
                  </button>
                )}
              </div>

              {/* Tests Grid */}
              {tests.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs space-y-3">
                  <Award className="w-10 h-10 mx-auto text-slate-700" />
                  <p className="font-semibold text-slate-400">No MCQ tests available yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tests.map((test) => (
                    <div
                      key={test.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition"
                    >
                      <div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold uppercase tracking-wider mb-2 inline-block">
                          MCQ ASSESSMENT
                        </span>
                        <h4 className="text-sm font-bold text-white">{test.title}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {test.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800">
                        <span>{test.questions?.length || 0} Questions</span>
                        <span>{test.duration || 30} Minutes</span>
                        <span className="font-bold text-amber-400">
                          {test.totalMarks || test.questions?.length || 10} Marks
                        </span>
                      </div>

                      {isStaff ? (
                        <button
                          onClick={() => router.push(`/teacher/courses/${courseId}/tests`)}
                          className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700 cursor-pointer"
                        >
                          Manage & Preview Test
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push(`/student/tests/${test.id}`)}
                          className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-500/20 cursor-pointer"
                        >
                          Start Test Engine
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ATTENDANCE REGISTER */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">Attendance Register</h3>
                  <p className="text-xs text-slate-400">
                    Track and record student class attendance
                  </p>
                </div>

                {isStaff && (
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    />
                    <button
                      onClick={handleSaveAttendance}
                      disabled={savingAttendance}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {savingAttendance ? 'Saving...' : 'Save Attendance'}
                    </button>
                  </div>
                )}
              </div>

              {attendanceSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {attendanceSuccess}
                </div>
              )}

              {isStaff ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Student Roster for {attendanceDate}
                  </h4>
                  {enrolledStudents.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No enrolled students to mark attendance.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">Email Address</th>
                            <th className="py-2.5 px-3 text-right">Attendance Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {enrolledStudents.map((item) => {
                            const s = item.student || item;
                            const isPresent = attendanceMap[s.id] ?? false;
                            return (
                              <tr key={s.id || item.id} className="hover:bg-slate-800/40 transition">
                                <td className="py-3 px-3 font-semibold text-white">
                                  {s.firstName} {s.lastName}
                                </td>
                                <td className="py-3 px-3 font-mono text-slate-400">{s.email}</td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAttendanceMap((prev) => ({
                                        ...prev,
                                        [s.id]: !isPresent,
                                      }))
                                    }
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                                      isPresent
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}
                                  >
                                    {isPresent ? 'PRESENT' : 'ABSENT'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* Student Own Attendance View */
                (() => {
                  const studentAttendanceRecords = Array.isArray(studentAttendance)
                    ? studentAttendance
                    : (studentAttendance?.records || []);
                  const totalSessions = studentAttendance?.totalSessions ?? studentAttendanceRecords.length;
                  const presentSessions = studentAttendance?.presentSessions ?? studentAttendanceRecords.filter((r: any) => r.isPresent).length;
                  const absentSessions = studentAttendance?.absentSessions ?? (totalSessions - presentSessions);
                  const percentage = studentAttendance?.percentage ?? (totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : null);

                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-teal-400" />
                            My Personal Attendance Scorecard
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">
                            Track your session presence and course eligibility for this subject
                          </p>
                        </div>

                        {percentage !== null && (
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                                Attendance Rate
                              </span>
                              <span className={`text-xl font-extrabold ${
                                percentage >= 75 ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {percentage}%
                              </span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                              percentage >= 75
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {percentage >= 75 ? 'GOOD STANDING' : 'LOW ATTENDANCE'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Attendance Summary KPIs */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Classes</span>
                          <p className="text-xl font-bold text-white mt-1">{totalSessions}</p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Present</span>
                          <p className="text-xl font-bold text-emerald-400 mt-1">{presentSessions}</p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Absent</span>
                          <p className="text-xl font-bold text-red-400 mt-1">{absentSessions}</p>
                        </div>
                      </div>

                      {/* Attendance History Log Table */}
                      {studentAttendanceRecords.length === 0 ? (
                        <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-500">
                          No attendance sessions recorded for your account in this course yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950">
                          <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                              <tr>
                                <th className="py-3 px-4">Session Date</th>
                                <th className="py-3 px-4">Subject Course</th>
                                <th className="py-3 px-4 text-right">Attendance Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                              {studentAttendanceRecords.map((rec: any, idx: number) => (
                                <tr key={rec.id || idx} className="hover:bg-slate-900/60 transition">
                                  <td className="py-3 px-4 font-semibold text-white">
                                    {new Date(rec.date).toLocaleDateString(undefined, {
                                      weekday: 'short',
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </td>
                                  <td className="py-3 px-4 text-slate-400">
                                    {rec.course?.title || course?.title || 'Subject Course'}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <span
                                      className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                                        rec.isPresent
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                                      }`}
                                    >
                                      {rec.isPresent ? 'PRESENT' : 'ABSENT'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </main>
      </div>

      {/* Allocate Students Modal */}
      {showAllocateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Allocate Students to Course</h3>
              <button onClick={() => setShowAllocateModal(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {allStudents.map((st) => {
                const isSelected = selectedStudentIds.includes(st.id);
                return (
                  <label
                    key={st.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/40 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {st.firstName} {st.lastName}
                      </p>
                      <p className="text-[10px] text-slate-500">{st.email}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() =>
                        setSelectedStudentIds((prev) =>
                          isSelected ? prev.filter((id) => id !== st.id) : [...prev, st.id]
                        )
                      }
                      className="rounded bg-slate-900 border-slate-800 text-blue-600 focus:ring-0"
                    />
                  </label>
                );
              })}
            </div>

            <button
              onClick={handleSaveStudentAllocations}
              disabled={allocating}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {allocating ? 'Saving Allocations...' : 'Save Allocated Students'}
            </button>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {showAddLessonModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Add New Course Lesson</h3>
              <button onClick={() => setShowAddLessonModal(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Lesson Title *</label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g., Intro to Rotational Dynamics"
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
                  placeholder="Summary of topics covered in this lecture..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Video Lecture (MP4 / S3 Direct Upload)</label>
                <FileUpload
                  folder="lessons"
                  onUploadComplete={(url) => setVideoUrl(url)}
                  accept="video/*"
                />
                {videoUrl && <p className="text-[10px] text-emerald-400 mt-1 truncate">✓ Video uploaded successfully</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Study Notes PDF (S3 Direct Upload)</label>
                <FileUpload
                  folder="lessons"
                  onUploadComplete={(url) => setPdfUrl(url)}
                  accept="application/pdf"
                />
                {pdfUrl && <p className="text-[10px] text-emerald-400 mt-1 truncate">✓ PDF uploaded successfully</p>}
              </div>

              <button
                type="submit"
                disabled={submittingLesson}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {submittingLesson ? 'Uploading Lesson...' : 'Save & Publish Lesson'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Live Class Modal */}
      {showScheduleLiveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Schedule Virtual Live Session</h3>
              <button onClick={() => setShowScheduleLiveModal(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleLiveClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Session Title *</label>
                <input
                  type="text"
                  value={liveTitle}
                  onChange={(e) => setLiveTitle(e.target.value)}
                  placeholder="e.g., Live Doubt Clearing Session"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Meeting Link (Zoom / Meet) *</label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={liveDuration}
                    onChange={(e) => setLiveDuration(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingLive}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {submittingLive ? 'Scheduling...' : 'Schedule Live Class'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create MCQ Test Modal */}
      {showCreateTestModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create New MCQ Assessment</h3>
              <button onClick={() => setShowCreateTestModal(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Test Title *</label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="e.g., Kinematics Unit Evaluation Test"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Two-Path Question Entry: Generate with AI OR Add Manually */}
              <div className="border-t border-slate-800 pt-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={testDuration}
                    onChange={(e) => setTestDuration(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Passing Marks (%)</label>
                  <input
                    type="number"
                    value={testPassingMarks}
                    onChange={(e) => setTestPassingMarks(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Test Questions</h4>
                  <button
                    type="button"
                    onClick={() =>
                      setQuestions((prev) => [
                        ...prev,
                        { question: '', options: ['', '', '', ''], correctAnswer: 0, marks: 1 },
                      ])
                    }
                    className="text-xs text-blue-400 font-bold hover:underline"
                  >
                    + Add Question
                  </button>
                </div>

                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => {
                        const newQ = [...questions];
                        newQ[qIdx].question = e.target.value;
                        setQuestions(newQ);
                      }}
                      placeholder={`Question ${qIdx + 1}...`}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={q.correctAnswer === optIdx}
                            onChange={() => {
                              const newQ = [...questions];
                              newQ[qIdx].correctAnswer = optIdx;
                              setQuestions(newQ);
                            }}
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newQ = [...questions];
                              newQ[qIdx].options[optIdx] = e.target.value;
                              setQuestions(newQ);
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            required
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={submittingTest}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {submittingTest ? 'Publishing Test...' : 'Publish MCQ Assessment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Post Course Announcement Modal */}
      {showPostAnnouncementModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Post Course Announcement</h3>
              <button onClick={() => setShowPostAnnouncementModal(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handlePostAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Announcement Title *</label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="e.g., Upcoming Quiz & Assignment Deadline"
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
                  placeholder="Share updates, homework details, or exam preparation tips with enrolled students..."
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
