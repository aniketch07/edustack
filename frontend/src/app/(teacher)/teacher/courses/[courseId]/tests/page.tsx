'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Award, BookOpen, CheckCircle2, FileText, HelpCircle, Loader2,
  Plus, Sparkles, Trash2, Eye, X, Check, XCircle,
} from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, UserRole } from '@/types';
import { useToast } from '@/components/Toast';

interface QuestionForm {
  question: string;
  options: string[];
  correctAnswer: number;
  marks: number;
}

type View = 'list' | 'create' | 'preview';

export default function TeacherCourseTestsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string;
  const toast = useToast();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [course, setCourse] = useState<any | null>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [previewTest, setPreviewTest] = useState<any | null>(null);

  // Create test form state
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [passingMarks, setPassingMarks] = useState<number>(5);
  const [questions, setQuestions] = useState<QuestionForm[]>([
    { question: '', options: ['', '', '', ''], correctAnswer: 0, marks: 1 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // AI state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTopics, setAiTopics] = useState('');
  const [aiCount, setAiCount] = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState('mix');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else if (user.role === UserRole.STUDENT) {
      router.push('/student/dashboard');
    } else {
      setCurrentUser(user);
      fetchData();
    }
  }, [courseId, router]);

  const fetchData = async () => {
    try {
      const [courseData, testsData] = await Promise.all([
        apiFetch<any>(`/courses/${courseId}`),
        apiFetch<any[]>(`/courses/${courseId}/tests`),
      ]);
      setCourse(courseData);
      setTests(testsData);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load course tests.');
      router.push('/teacher/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // ---- Create test handlers ----
  const openCreate = () => {
    setTestTitle('');
    setTestDescription('');
    setDuration(30);
    setPassingMarks(5);
    setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0, marks: 1 }]);
    setShowAiPanel(false);
    setAiTopics('');
    setAiCount(10);
    setAiDifficulty('mix');
    setAiError(null);
    setView('create');
  };

  const updateQuestion = (idx: number, patch: Partial<QuestionForm>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { question: '', options: ['', '', '', ''], correctAnswer: 0, marks: 1 }]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAiGenerate = async () => {
    if (!aiTopics.trim()) {
      setAiError('Please enter topics for the AI to generate questions on.');
      return;
    }
    setGenerating(true);
    setAiError(null);
    try {
      const res = await apiFetch<{ questions: Array<{ question: string; options: string[]; correctAnswer: number }> }>(
        '/ai/generate-mcq',
        { method: 'POST', body: JSON.stringify({ topics: aiTopics, count: aiCount, difficulty: aiDifficulty }) },
      );
      const gen = res.questions || [];
      if (gen.length === 0) {
        setAiError('AI returned no questions. Try again.');
        return;
      }
      setQuestions((prev) => {
        const firstEmpty =
          prev.length > 0 && !prev[0].question.trim() && prev[0].options.every((o) => !o.trim());
        const base = firstEmpty ? prev.slice(1) : prev;
        return [...base, ...gen.map((q) => ({ question: q.question, options: q.options, correctAnswer: q.correctAnswer, marks: 1 }))];
      });
      setShowAiPanel(false);
    } catch (err: any) {
      setShowAiPanel(false);
      setAiError(null);
      toast.info('AI generation is temporarily unavailable. Add your questions manually below.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const validQuestions = questions
      .filter((q) => {
        const hasText = q.question.trim().length > 0;
        const validOptions = q.options.filter((o) => o.trim().length > 0).length;
        return hasText && validOptions >= 2;
      })
      .map((q) => ({
        question: q.question,
        options: q.options.filter((o) => o.trim().length > 0),
        correctAnswer: q.correctAnswer,
        marks: Number(q.marks) || 1,
      }));
    if (validQuestions.length === 0) {
      toast.error('Add at least one question with a question and at least 2 options.');
      return;
    }
    const totalMarks = validQuestions.reduce((sum, q) => sum + q.marks, 0);
    const safePassing = Math.min(Math.max(Number(passingMarks) || 1, 1), totalMarks);

    setSubmitting(true);
    try {
      await apiFetch(`/courses/${courseId}/tests`, {
        method: 'POST',
        body: JSON.stringify({
          title: testTitle,
          description: testDescription || undefined,
          duration: Number(duration) || 30,
          totalMarks,
          passingMarks: safePassing,
          questions: validQuestions,
        }),
      });
      toast.success(`MCQ Test "${testTitle}" created successfully!`);
      await fetchData();
      setView('list');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create test.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm('Delete this test permanently?')) return;
    try {
      await apiFetch(`/courses/${courseId}/tests/${id}`, { method: 'DELETE' });
      setTests((prev) => prev.filter((t) => t.id !== id));
      toast.success('Test deleted.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete test.');
    }
  };

  const openPreview = (test: any) => {
    setPreviewTest(test);
    setView('preview');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center text-xs gap-3">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        <span>Loading course tests...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-8 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/teacher/dashboard')}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white">{course?.title || 'Course'} — MCQ Tests</h1>
            <p className="text-xs text-slate-400">Create, preview, and manage assessments for this course.</p>
          </div>
        </div>
        {view !== 'create' && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create MCQ Test
          </button>
        )}
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-5xl w-full mx-auto">
        {/* VIEW: LIST */}
        {view === 'list' && (
          <div className="space-y-4">
            {tests.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-14 text-center text-slate-500 text-xs space-y-3">
                <HelpCircle className="w-10 h-10 mx-auto text-slate-700" />
                <p className="font-semibold text-slate-400">No MCQ tests for this course yet.</p>
                <p className="text-slate-500">Click "Create MCQ Test" to add your first assessment.</p>
              </div>
            ) : (
              tests.map((test) => (
                <div key={test.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-slate-700 transition">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white">{test.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 flex flex-wrap gap-3">
                        <span>{test.questions?.length || 0} Questions</span>
                        <span>{test.duration || 30} Mins</span>
                        <span className="text-amber-400 font-bold">{test.totalMarks} Marks</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openPreview(test)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                    <button
                      onClick={() => handleDeleteTest(test.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition cursor-pointer"
                      title="Delete test"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* VIEW: CREATE */}
        {view === 'create' && (
          <form onSubmit={handleCreateTest} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                Create MCQ Test
              </h2>
              <button type="button" onClick={() => setView('list')} className="text-xs text-slate-400 hover:text-white">
                ✕ Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Test Title *</label>
                <input type="text" value={testTitle} onChange={(e) => setTestTitle(e.target.value)} required
                  placeholder="e.g., Chapter 1 MCQ Quiz: Mechanics & Friction"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea rows={2} value={testDescription} onChange={(e) => setTestDescription(e.target.value)}
                  placeholder="Optional test description..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Mins)</label>
                <input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Passing Marks</label>
                <input type="number" min={1} value={passingMarks} onChange={(e) => setPassingMarks(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div className="flex items-end">
                <p className="text-[11px] text-slate-400">
                  {questions.length} question(s) · marks auto-summed on save
                </p>
              </div>
            </div>

            {/* Two-path question entry */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">How do you want to add questions?</label>
              {!showAiPanel ? (
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setShowAiPanel(true)}
                    className="p-3.5 rounded-2xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-left transition cursor-pointer">
                    <span className="text-sm font-bold text-purple-300">✨ Generate with AI</span>
                    <p className="text-[11px] text-slate-400 mt-1">Enter topics &amp; count — AI writes the questions for you.</p>
                  </button>
                  <button type="button" onClick={() => setShowAiPanel(false)}
                    className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950 hover:border-slate-700 text-left transition cursor-pointer">
                    <span className="text-sm font-bold text-white">✍️ Add Manually</span>
                    <p className="text-[11px] text-slate-400 mt-1">Write each question yourself below.</p>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300">✨ AI Question Generator</span>
                    <button type="button" onClick={() => { setShowAiPanel(false); setAiError(null); }}
                      className="text-[11px] text-slate-400 hover:text-white transition">✕ Back to manual</button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Topics (comma-separated) *</label>
                    <input type="text" value={aiTopics} onChange={(e) => setAiTopics(e.target.value)}
                      placeholder="e.g., Newton Laws of Motion, Kinematics, Friction"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Number of Questions</label>
                      <input type="number" min={1} max={100} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
                      <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer">
                        <option value="mix">Mixed</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                  {aiError && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{aiError}</div>}
                  <button type="button" onClick={handleAiGenerate} disabled={generating}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-60 cursor-pointer">
                    {generating ? (<><Loader2 className="w-4 h-4 animate-spin" /> Generating {aiCount} questions...</>)
                      : (<><Sparkles className="w-4 h-4" /> Generate Questions</>)}
                  </button>
                  <p className="text-[10px] text-slate-500">AI questions are added below for review — edit before publishing.</p>
                </div>
              )}
            </div>

            {/* Question builder */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Test Questions ({questions.length})</h3>
                <button type="button" onClick={addQuestion}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Add Question
                </button>
              </div>
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      Question {qIdx + 1}
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">
                        {q.marks || 1} Mark
                      </span>
                    </span>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(qIdx)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                    )}
                  </div>
                  <input type="text" value={q.question} onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
                    placeholder={`Enter question ${qIdx + 1} prompt...`} required
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input type="radio" name={`correct-${qIdx}`} checked={q.correctAnswer === optIdx}
                          onChange={() => updateQuestion(qIdx, { correctAnswer: optIdx })}
                          className="w-3.5 h-3.5 text-purple-600 bg-slate-900" />
                        <input type="text" value={opt} onChange={(e) => {
                          const options = [...q.options];
                          options[optIdx] = e.target.value;
                          updateQuestion(qIdx, { options });
                        }} placeholder={`Option ${String.fromCharCode(65 + optIdx)}`} required
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button type="button" onClick={() => setView('list')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition">Cancel</button>
              <button type="submit" disabled={submitting}
                className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50">
                {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>) : (<><CheckCircle2 className="w-4 h-4" /> Publish Test</>)}
              </button>
            </div>
          </form>
        )}

        {/* VIEW: PREVIEW */}
        {view === 'preview' && previewTest && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{previewTest.title}</h2>
                <p className="text-xs text-slate-400">
                  Student preview · {previewTest.questions?.length || 0} questions · {previewTest.duration || 30} mins · {previewTest.totalMarks} marks
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  Correct answers shown
                </span>
                <button onClick={() => setView('list')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer">Back to list</button>
              </div>
            </div>

            {previewTest.questions?.map((q: any, qIdx: number) => (
              <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400">Question {qIdx + 1}</span>
                  <span className="text-[11px] text-slate-500">{q.marks || 1} Mark(s)</span>
                </div>
                <p className="text-sm font-semibold text-white">{q.question}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options?.map((opt: string, optIdx: number) => {
                    const isCorrect = q.correctAnswer === optIdx;
                    return (
                      <div key={optIdx} className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
                        isCorrect ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}>
                        {isCorrect ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
