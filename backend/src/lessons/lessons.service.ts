import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { loadDevStore } from '../common/dev-store';
import { syncAllDevStore } from '../common/store-sync';
import { sanitizeText } from '../common/sanitize';
import { MEMORY_INSTITUTES, MEMORY_USERS } from '../institutes/institutes.service';
import { MEMORY_COURSES } from '../courses/courses.service';
import { MEMORY_ENROLLMENTS } from '../enrollments/enrollments.service';
import { MEMORY_ATTENDANCE } from '../attendance/attendance.service';
import { MEMORY_TESTS, MEMORY_QUESTIONS, MEMORY_TEST_ATTEMPTS } from '../tests/tests.service';
import { MEMORY_ANNOUNCEMENTS } from '../announcements/announcements.service';
import { MEMORY_LIVE_CLASSES } from '../live-classes/live-classes.service';

export let MEMORY_LESSONS: any[] = [];
export let MEMORY_VIDEO_PROGRESS: any[] = [];

const initialStore = loadDevStore();
if (initialStore.lessons) MEMORY_LESSONS.push(...initialStore.lessons);
if (initialStore.videoProgress) MEMORY_VIDEO_PROGRESS.push(...initialStore.videoProgress);

@Injectable()
export class LessonsService implements OnModuleInit {
  private readonly logger = new Logger(LessonsService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const loaded = loadDevStore();
    MEMORY_LESSONS.length = 0;
    MEMORY_VIDEO_PROGRESS.length = 0;
    if (loaded.lessons) MEMORY_LESSONS.push(...loaded.lessons);
    if (loaded.videoProgress) MEMORY_VIDEO_PROGRESS.push(...loaded.videoProgress);
  }

  async create(courseId: string, createLessonDto: CreateLessonDto) {
    const { videoUrl, pdfUrl, order, duration } = createLessonDto;
    const title = sanitizeText(createLessonDto.title);
    const description = sanitizeText(createLessonDto.description);

    try {
      const lesson = await this.prisma.lesson.create({
        data: {
          courseId,
          title,
          description: description || null,
          videoUrl: videoUrl || null,
          pdfUrl: pdfUrl || null,
          order: order ?? 0,
          duration: duration || null,
        },
      });

      return {
        message: 'Lesson added successfully',
        lesson,
      };
    } catch (error: any) {
      this.logger.warn(`Database operation failed. Using dev store for lesson: ${title}`);
    }

    const newLesson = {
      id: `lesson-${Date.now()}`,
      courseId,
      title,
      description: description || null,
      videoUrl: videoUrl || null,
      pdfUrl: pdfUrl || null,
      order: order ?? 0,
      duration: duration || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    MEMORY_LESSONS.push(newLesson);

    const courseIndex = MEMORY_COURSES.findIndex((c) => c.id === courseId);
    if (courseIndex !== -1) {
      const currentLessons = MEMORY_LESSONS.filter((l) => l.courseId === courseId).length;
      MEMORY_COURSES[courseIndex]._count = {
        ...MEMORY_COURSES[courseIndex]._count,
        lessons: currentLessons,
      };
    }

    syncAllDevStore();

    return {
      message: 'Lesson added successfully (Dev Store)',
      lesson: newLesson,
    };
  }

  async findByCourse(courseId: string) {
    try {
      const lessons = await this.prisma.lesson.findMany({
        where: { courseId },
        orderBy: { order: 'asc' },
      });

      const memoryMatches = MEMORY_LESSONS.filter((l) => l.courseId === courseId);
      const dbIds = new Set(lessons.map((r) => r.id));
      const uniqueMemory = memoryMatches.filter((m) => !dbIds.has(m.id));
      return [...lessons, ...uniqueMemory];
    } catch (error) {
      return MEMORY_LESSONS.filter((l) => l.courseId === courseId);
    }
  }

  async updateProgress(studentId: string, lessonId: string, updateProgressDto: UpdateProgressDto) {
    const { watchedDuration, totalDuration } = updateProgressDto;
    const watchPercentage = (watchedDuration / (totalDuration || 1)) * 100;
    const completed = watchPercentage >= 90;

    try {
      const progress = await this.prisma.videoProgress.upsert({
        where: {
          studentId_lessonId: {
            studentId,
            lessonId,
          },
        },
        update: {
          watchedDuration: Math.round(watchedDuration),
          completed,
          lastWatchedAt: new Date(),
        },
        create: {
          studentId,
          lessonId,
          watchedDuration: Math.round(watchedDuration),
          completed,
        },
      });

      return {
        message: 'Video progress saved',
        progress,
      };
    } catch (error: any) {
      this.logger.warn(`Database video progress update failed. Using dev store for lesson: ${lessonId}`);
    }

    const idx = MEMORY_VIDEO_PROGRESS.findIndex((p) => p.studentId === studentId && p.lessonId === lessonId);
    const rec = {
      id: idx !== -1 ? MEMORY_VIDEO_PROGRESS[idx].id : `vp-${Date.now()}`,
      studentId,
      lessonId,
      watchedDuration: Math.round(watchedDuration),
      completed: idx !== -1 ? MEMORY_VIDEO_PROGRESS[idx].completed || completed : completed,
      lastWatchedAt: new Date(),
    };

    if (idx !== -1) {
      MEMORY_VIDEO_PROGRESS[idx] = rec;
    } else {
      MEMORY_VIDEO_PROGRESS.push(rec);
    }

    syncAllDevStore();

    return {
      message: 'Video progress saved (Dev Store)',
      progress: rec,
    };
  }

  async getCourseProgress(studentId: string, courseId: string) {
    const courseLessons = await this.findByCourse(courseId);
    const lessonIds = courseLessons.map((l) => l.id);

    try {
      const dbProgress = await this.prisma.videoProgress.findMany({
        where: {
          studentId,
          lessonId: { in: lessonIds },
        },
      });

      const memProgress = MEMORY_VIDEO_PROGRESS.filter((p) => p.studentId === studentId && lessonIds.includes(p.lessonId));
      const combined = [...dbProgress, ...memProgress];

      const completedCount = combined.filter((p) => p.completed).length;
      const totalLessons = courseLessons.length;
      const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      return {
        totalLessons,
        completedCount,
        percentage,
        progressList: combined,
      };
    } catch (error) {
      const memProgress = MEMORY_VIDEO_PROGRESS.filter((p) => p.studentId === studentId && lessonIds.includes(p.lessonId));
      const completedCount = memProgress.filter((p) => p.completed).length;
      const totalLessons = courseLessons.length;
      const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      return {
        totalLessons,
        completedCount,
        percentage,
        progressList: memProgress,
      };
    }
  }

  async remove(courseId: string, id: string) {
    try {
      await this.prisma.lesson.delete({ where: { id } });
    } catch (e) {
      this.logger.warn(`Database remove failed for lesson: ${id}. Falling back to dev store.`);
    }

    const index = MEMORY_LESSONS.findIndex((l) => l.id === id && l.courseId === courseId);
    if (index !== -1) {
      MEMORY_LESSONS.splice(index, 1);
      syncAllDevStore();
    }

    return { message: 'Lesson deleted successfully' };
  }
}
