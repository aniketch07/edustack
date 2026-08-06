import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { loadDevStore } from '../common/dev-store';
import { syncAllDevStore } from '../common/store-sync';
import { MEMORY_INSTITUTES, MEMORY_USERS } from '../institutes/institutes.service';
import { MEMORY_COURSES } from '../courses/courses.service';
import { MEMORY_LESSONS } from '../lessons/lessons.service';
import { MEMORY_ATTENDANCE } from '../attendance/attendance.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export let MEMORY_ENROLLMENTS: any[] = [];

const initialStore = loadDevStore();
if (initialStore.enrollments) {
  MEMORY_ENROLLMENTS.push(...initialStore.enrollments);
}

@Injectable()
export class EnrollmentsService implements OnModuleInit {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    private prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  onModuleInit() {
    const loaded = loadDevStore();
    MEMORY_ENROLLMENTS.length = 0;
    if (loaded.enrollments) {
      MEMORY_ENROLLMENTS.push(...loaded.enrollments);
    }
  }

  async enrollStudents(instituteId: string, courseId: string, studentIds: string[]) {
    if (!instituteId) {
      throw new BadRequestException('Institute context missing');
    }

    try {
      const course = await this.prisma.course.findFirst({
        where: { id: courseId, instituteId },
      });

      if (course) {
        const enrollmentsData = studentIds.map((studentId) => ({
          studentId,
          courseId,
        }));

        await this.prisma.enrollment.createMany({
          data: enrollmentsData,
          skipDuplicates: true,
        });

        const currentCount = await this.prisma.enrollment.count({
          where: { courseId },
        });

        // Realtime notification: Notify enrolled students instantly
        this.realtime.emitToUsers(studentIds, 'course:enrolled', {
          courseId,
          courseTitle: course.title,
        });

        return {
          message: 'Students allocated to course successfully',
          enrolledCount: currentCount,
        };
      }
    } catch (error: any) {
      this.logger.warn(`Database operation failed. Using dev store for course enrollment: ${courseId}`);
    }

    // Dev Store Fallback — additive, matches DB skipDuplicates behavior
    const courseIndex = MEMORY_COURSES.findIndex((c) => c.id === courseId && c.instituteId === instituteId);
    const existingIds = new Set(
      MEMORY_ENROLLMENTS.filter((e) => e.courseId === courseId).map((e) => e.studentId),
    );

    studentIds.forEach((sId) => {
      if (existingIds.has(sId)) return; // skip duplicate — matches DB skipDuplicates: true
      const foundStudent = MEMORY_USERS.find((u) => u.id === sId);
      MEMORY_ENROLLMENTS.push({
        id: `enroll-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentId: sId,
        courseId,
        enrolledAt: new Date(),
        student: foundStudent
          ? {
              id: foundStudent.id,
              firstName: foundStudent.firstName,
              lastName: foundStudent.lastName,
              email: foundStudent.email,
              phone: foundStudent.phone,
            }
          : null,
      });
    });

    if (courseIndex !== -1) {
      MEMORY_COURSES[courseIndex]._count = {
        ...MEMORY_COURSES[courseIndex]._count,
        enrollments: studentIds.length,
      };
    }

    syncAllDevStore();

    const memCourse = MEMORY_COURSES.find((c) => c.id === courseId);
    this.realtime.emitToUsers(studentIds, 'course:enrolled', {
      courseId,
      courseTitle: memCourse?.title || 'New Course',
    });

    return {
      message: 'Students allocated to course successfully (Dev Store)',
      enrolledCount: studentIds.length,
    };
  }

  async getCourseEnrollments(instituteId: string, courseId: string) {
    try {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          courseId,
          course: { instituteId },
        },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      });

      const memoryMatches = MEMORY_ENROLLMENTS.filter((e) => e.courseId === courseId);
      const dbIds = new Set(enrollments.map((r) => r.id));
      const uniqueMemory = memoryMatches.filter((m) => !dbIds.has(m.id));
      return [...enrollments, ...uniqueMemory];
    } catch (error) {
      return MEMORY_ENROLLMENTS.filter((e) => e.courseId === courseId);
    }
  }

  async getStudentEnrolledCourses(studentId: string) {
    try {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: {
            include: {
              teacher: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
              _count: {
                select: { lessons: true, enrollments: true },
              },
            },
          },
        },
      });

      const dbCourses = enrollments.map((e) => e.course);
      const memoryEnrollmentCourseIds = MEMORY_ENROLLMENTS.filter((e) => e.studentId === studentId).map((e) => e.courseId);
      const memoryCourses = MEMORY_COURSES.filter((c) => memoryEnrollmentCourseIds.includes(c.id));

      const courseIds = new Set(dbCourses.map((r) => r.id));
      const uniqueMemoryCourses = memoryCourses.filter((m) => !courseIds.has(m.id));

      return [...dbCourses, ...uniqueMemoryCourses];
    } catch (error) {
      const memoryEnrollmentCourseIds = MEMORY_ENROLLMENTS.filter((e) => e.studentId === studentId).map((e) => e.courseId);
      return MEMORY_COURSES.filter((c) => memoryEnrollmentCourseIds.includes(c.id));
    }
  }

  async unenrollStudent(instituteId: string, courseId: string, studentId: string) {
    try {
      await this.prisma.enrollment.deleteMany({
        where: {
          courseId,
          studentId,
          course: { instituteId },
        },
      });
    } catch (e: any) {
      this.logger.error(`Database unenroll failed for student ${studentId} in course ${courseId}. Error: ${e.message}`);
      throw e;
    }
    const index = MEMORY_ENROLLMENTS.findIndex((e) => e.courseId === courseId && e.studentId === studentId);
    if (index !== -1) {
      MEMORY_ENROLLMENTS.splice(index, 1);
    }
    syncAllDevStore();
    // Realtime notification: Notify student socket that they were unenrolled from courseId
    this.realtime.emitToUsers([studentId], 'course:unenrolled', { courseId });

    return { message: 'Student removed from course' };
  }
}
