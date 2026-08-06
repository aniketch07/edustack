'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { BookOpen, ArrowLeft, Award, XCircle, HelpCircle, Clock, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function StudentTestPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params?.testId as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<any | null>(null);
  const [course, setCourse] = useState<any | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  useEffect(() => {
    const user = getUser();
    if (!user || isTokenExpired()) {
      removeToken();
      router.push('/login');
    } else if (testId) {
      fetchTest();
    }
  }, [testId, router]);

  const fetchTest = async () => {
    try {
      const data = await apiFetch<any>(`/tests/${testId}`);
      setTest(data);
      setCourse(data.course);
      if (data.lastAttempt) {
        setTestResult(data.lastAttempt);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load test.');
      router.push('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmit = async () => {
    if (!test) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<any>(`/tests/${test.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: userAnswers }),
      });
      setTestResult(res.attempt || res);
      toast.success('Test submitted and graded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit test.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center text-xs gap-3">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        <span>Loading test...</span>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center text-xs gap-3">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p>Test not found.</p>
        <button onClick={() => router.push('/student/dashboard')} className="text-purple-400 hover:underline">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const answeredCount = Object.keys(userAnswers).length;
  const totalQuestions = test.questions?.length || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-8 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/student/dashboard')}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white">{test.title}</h1>
            <p className="text-xs text-slate-400">
              {course?.title || 'Course Test'}
              {' · '}
              {test.duration || 30} Mins · {test.totalMarks} Total Marks · {totalQuestions} Questions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {!testResult && (
            <>
              <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {test.duration || 30} Mins
              </span>
              <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-bold">
                {answeredCount}/{totalQuestions} Answered
              </span>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-3xl w-full mx-auto">
        {testResult ? (
          /* Scorecard (report) */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-xl space-y-6 max-w-lg mx-auto">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Test Report Card
            </span>
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center border ${
              testResult.passed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'
            }`}>
              {testResult.passed ? (
                <Award className="w-10 h-10 text-emerald-400" />
              ) : (
                <XCircle className="w-10 h-10 text-red-400" />
              )}
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-white">
                {testResult.passed ? 'Test Passed! 🎉' : 'Test Failed'}
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Your Score: <span className="text-xl font-bold text-purple-400">{testResult.score} / {testResult.totalMarks}</span>
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Status</span>
                <p className={`font-bold mt-1 ${testResult.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {testResult.passed ? 'PASSED' : 'FAILED'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Percentage</span>
                <p className="font-bold text-white mt-1">
                  {Math.round((testResult.score / (testResult.totalMarks || 1)) * 100)}%
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Questions</span>
                <p className="font-bold text-white mt-1">{totalQuestions}</p>
              </div>
            </div>

            <button
              onClick={() => router.push('/student/dashboard')}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-md"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          /* Questions */
          <div className="space-y-6">
            {totalQuestions === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
                <HelpCircle className="w-10 h-10 mx-auto text-slate-700" />
                <p className="font-semibold text-slate-400 mt-3">This test has no questions.</p>
              </div>
            ) : (
              test.questions.map((q: any, qIdx: number) => (
                <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        {qIdx + 1}
                      </span>
                      Question {qIdx + 1}
                    </span>
                    <span className="text-[11px] text-slate-500">{q.marks || 1} Mark(s)</span>
                  </div>

                  <p className="text-sm font-semibold text-white leading-relaxed">{q.question}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q.options?.map((opt: string, optIdx: number) => {
                      const selected = userAnswers[q.id] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition cursor-pointer ${
                            selected
                              ? 'bg-purple-500/15 border-purple-500/40 text-purple-200 shadow-lg shadow-purple-500/10'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            selected ? 'border-purple-400 text-purple-300' : 'border-slate-600 text-slate-500'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="text-xs font-medium">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Submit bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4">
              <p className="text-xs text-slate-400">
                {answeredCount} of {totalQuestions} answered
                {answeredCount < totalQuestions && (
                  <span className="text-amber-400 ml-1">— review before submitting</span>
                )}
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || totalQuestions === 0}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-500 hover:from-purple-500 hover:to-emerald-400 text-white text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Grading Test...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Submit & Grade Test
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
