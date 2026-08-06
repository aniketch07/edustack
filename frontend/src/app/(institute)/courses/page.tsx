'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Plus, Search, UserCheck, ArrowLeft, LogOut, CheckCircle2, Users, Image as ImageIcon, Trash2 } from 'lucide-react';
import { getUser, removeToken, isTokenExpired } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { User, Course, UserRole } from '@/types';
import FileUpload from '@/components/FileUpload';
import { useToast } from '@/components/Toast';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';

export default function CourseManagementPage() {
  const router = useRouter();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Create Course Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Allocation Modal State
  const [selectedCourseForAllocation, setSelectedCourseForAllocation] = useState<Course | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [currentlyEnrolledStudentIds, setCurrentlyEnrolledStudentIds] = useState<string[]>([]);
  const [allocating, setAllocating] = useState(false);
  const [allocationSuccess, setAllocationSuccess] = useState<string | null>(null);

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
  }, [router]);

  useRealtimeEvents({
    'course:created': () => fetchData(),
    'course:deleted': (payload: any) => {
      if (payload?.id) {
        setCourses((prev) => prev.filter((c) => c.id !== payload.id));
      }
    },
  });

  const handleDeleteCourse = async (courseId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;
    try {
      await apiFetch(`/courses/${courseId}`, { method: 'DELETE' });
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      toast.success(`Course "${title}" deleted successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete course.');
    }
  };

  const fetchData = async () => {
    try {
      const [coursesData, teachersData, studentsData] = await Promise.all([
        apiFetch<Course[]>('/courses'),
        apiFetch<User[]>('/users?role=TEACHER'),
        apiFetch<User[]>('/users?role=STUDENT'),
      ]);
      setCourses(coursesData);
      setTeachers(teachersData);
      setStudents(studentsData);
    } catch (e) {
      console.error('Failed to load courses data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);

    try {
      await apiFetch<Course>('/courses', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          price: Number(price) || 0,
          thumbnailUrl: thumbnailUrl || undefined,
          teacherId: selectedTeacherId || undefined,
        }),
      });

      setSuccessMessage('');
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setPrice(0);
      setThumbnailUrl('');
      setSelectedTeacherId('');
      fetchData();
      toast.success(`Course "${title}" created successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create course.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTeacher = async (courseId: string, teacherId: string) => {
    try {
      await apiFetch(`/courses/${courseId}`, {
        method: 'PATCH',
        body: JSON.stringify({ teacherId: teacherId || null }),
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign teacher.');
    }
  };

  const handleOpenAllocationModal = async (course: Course) => {
    setSelectedCourseForAllocation(course);
    setAllocationSuccess(null);
    try {
      const enrollments = await apiFetch<any[]>(`/courses/${course.id}/enrollments`);
      const enrolledIds = enrollments
        .map((e) => e.studentId || e.student?.id)
        .filter(Boolean);
      setSelectedStudentIds(enrolledIds);
      setCurrentlyEnrolledStudentIds(enrolledIds);
    } catch (e) {
      setSelectedStudentIds([]);
      setCurrentlyEnrolledStudentIds([]);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const handleSaveStudentAllocations = async () => {
    if (!selectedCourseForAllocation) return;
    setAllocating(true);
    setAllocationSuccess(null);

    try {
      const currentIds = new Set(currentlyEnrolledStudentIds);
      const toAdd = selectedStudentIds.filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !selectedStudentIds.includes(id));

      if (toAdd.length > 0) {
        await apiFetch(`/courses/${selectedCourseForAllocation.id}/enrollments`, {
          method: 'POST',
          body: JSON.stringify({ studentIds: toAdd }),
        });
      }

      if (toRemove.length > 0) {
        await Promise.all(
          toRemove.map((id) =>
            apiFetch(`/courses/${selectedCourseForAllocation.id}/enrollments/${id}`, { method: 'DELETE' }),
          ),
        );
      }

      setAllocationSuccess('Student course allocations updated successfully!');
      setTimeout(() => {
        setSelectedCourseForAllocation(null);
        fetchData();
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Failed to update student allocations.');
    } finally {
      setAllocating(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  const filteredCourses = courses.filter(
    (c) =>
      (c?.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c?.description || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const instLogo = currentUser?.institute?.logoUrl;

  return (
    <div className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Institute Courses</h1>
            <p className="text-slate-400 text-sm mt-1">Create courses, add thumbnail banners, assign faculty teachers, and allocate students.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Create New Course
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading courses...</div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No Courses Found</p>
            <p className="text-xs text-slate-500">Click "Create New Course" to add your first course catalog item.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course: any) => {
              const thumb = course.thumbnailUrl || course.thumbnail;
              return (
                <div
                  key={course.id}
                  onClick={() => router.push(`/courses/${course.id}`)}
                  className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between transition group cursor-pointer"
                >
                  {/* Course Thumbnail Image Header */}
                  {thumb ? (
                    <div className="h-36 w-full overflow-hidden bg-slate-950 relative">
                      <img src={thumb} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                    </div>
                  ) : null}

                  <div className="p-6 space-y-4">
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
                      <span className="text-sm font-mono font-bold text-white">
                        {(course.price ?? 0) === 0 ? 'FREE' : `₹${(course.price ?? 0).toLocaleString('en-IN')}`}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition">{course.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{course.description}</p>
                    </div>
                  </div>

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="p-6 border-t border-slate-800 bg-slate-950/40 space-y-3"
                  >
                    {/* Inline Teacher Assignment Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                        Assigned Teacher
                      </label>
                      <select
                        value={course.teacherId || ''}
                        onChange={(e) => handleAssignTeacher(course.id, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-teal-500 cursor-pointer"
                      >
                        <option value="">-- No Teacher Assigned --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.firstName} {t.lastName} ({t.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAllocationModal(course);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-semibold transition cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Set Allocated Students ({course._count?.enrollments || 0})
                      </button>

                      {currentUser?.role === UserRole.INSTITUTE_ADMIN && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCourse(course.id, course.title);
                          }}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          title="Delete Course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-400">
                <BookOpen className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Create New Course</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {successMessage}
              </div>
            )}

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Course Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., JEE Advanced Physics Masterclass 2026"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Course Description *</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Comprehensive course covering mechanics, thermodynamics, and electromagnetism..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Price (₹ INR) *</label>
                  <input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="0 for Free"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Teacher</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Assign Later --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Course Thumbnail</label>
                <FileUpload
                  folder="courses"
                  accept="image/png,image/jpeg,image/webp"
                  label=""
                  description="Upload course thumbnail image — max 25 MB (PNG, JPG, WEBP)"
                  onUploadComplete={(publicUrl) => setThumbnailUrl(publicUrl)}
                />
                {thumbnailUrl && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-medium">Banner Preview:</span>
                    <img src={thumbnailUrl} alt="Thumbnail Preview" className="w-16 h-10 object-cover rounded-lg border border-slate-800" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Allocation Modal */}
      {selectedCourseForAllocation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Users className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold text-white">Allocate Students to Course</h3>
                  <p className="text-xs text-slate-400">{selectedCourseForAllocation?.title}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCourseForAllocation(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            {allocationSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {allocationSuccess}
              </div>
            )}

            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 divide-y divide-slate-800/60 p-2 space-y-1">
              {students.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">No students registered in institute yet.</div>
              ) : (
                students.map((student) => {
                  const isChecked = selectedStudentIds.includes(student.id);
                  return (
                    <label
                      key={student.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                        isChecked ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-slate-900'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{student.firstName} {student.lastName}</p>
                        <p className="text-[11px] text-slate-400">{student.email}</p>
                      </div>

                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStudentSelection(student.id)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 rounded cursor-pointer"
                      />
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCourseForAllocation(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStudentAllocations}
                disabled={allocating}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {allocating ? 'Saving Allocations...' : `Save Allocations (${selectedStudentIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
