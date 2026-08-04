import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { loadDevStore } from '../common/dev-store';
import { syncAllDevStore } from '../common/store-sync';
import { sanitizeText } from '../common/sanitize';
import { MEMORY_INSTITUTES, MEMORY_USERS } from '../institutes/institutes.service';
import { MEMORY_COURSES } from '../courses/courses.service';
import { MEMORY_ENROLLMENTS } from '../enrollments/enrollments.service';
import { MEMORY_LESSONS } from '../lessons/lessons.service';
import { MEMORY_ATTENDANCE } from '../attendance/attendance.service';
import { MEMORY_TESTS, MEMORY_QUESTIONS, MEMORY_TEST_ATTEMPTS } from '../tests/tests.service';

export let MEMORY_ANNOUNCEMENTS: any[] = [];

const initialStore = loadDevStore();
if (initialStore.announcements) {
  MEMORY_ANNOUNCEMENTS.push(...initialStore.announcements);
}

@Injectable()
export class AnnouncementsService implements OnModuleInit {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const loaded = loadDevStore();
    MEMORY_ANNOUNCEMENTS.length = 0;
    if (loaded.announcements) {
      MEMORY_ANNOUNCEMENTS.push(...loaded.announcements);
    }
  }

  async create(instituteId: string, createAnnouncementDto: CreateAnnouncementDto) {
    const { isPublished, courseId } = createAnnouncementDto;
    const title = sanitizeText(createAnnouncementDto.title);
    const content = sanitizeText(createAnnouncementDto.content);

    try {
      const announcement = await this.prisma.announcement.create({
        data: {
          instituteId,
          courseId: courseId || null,
          title,
          content,
          isPublished: isPublished ?? true,
        },
        include: {
          course: {
            select: { id: true, title: true },
          },
        },
      });

      return {
        message: 'Announcement published successfully',
        announcement,
      };
    } catch (error: any) {
      this.logger.warn(`Database announcement create failed. Using dev store for: ${title}`);
    }

    let courseObj: any = null;
    if (courseId) {
      courseObj = MEMORY_COURSES.find((c) => c.id === courseId) || null;
    }

    const newAnnouncement = {
      id: `ann-${Date.now()}`,
      instituteId,
      courseId: courseId || null,
      course: courseObj ? { id: courseObj.id, title: courseObj.title } : null,
      title,
      content,
      isPublished: isPublished ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    MEMORY_ANNOUNCEMENTS.push(newAnnouncement);
    syncAllDevStore();

    return {
      message: 'Announcement published successfully (Dev Store)',
      announcement: newAnnouncement,
    };
  }

  async findAllByInstitute(
    instituteId: string,
    courseId?: string,
    userRole?: string,
    userId?: string,
  ) {
    try {
      let whereClause: any = { instituteId };

      if (courseId) {
        whereClause.courseId = courseId;
      } else if (userRole === 'STUDENT' && userId) {
        // Enrolled courses for this student + global announcements (courseId === null)
        const enrollments = await this.prisma.enrollment.findMany({
          where: { studentId: userId },
          select: { courseId: true },
        });
        const enrolledCourseIds = enrollments.map((e) => e.courseId);
        whereClause.OR = [{ courseId: null }, { courseId: { in: enrolledCourseIds } }];
      } else if (userRole === 'TEACHER' && userId) {
        // Assigned courses for this teacher + global announcements (courseId === null)
        const teacherCourses = await this.prisma.course.findMany({
          where: { teacherId: userId },
          select: { id: true },
        });
        const assignedCourseIds = teacherCourses.map((c) => c.id);
        whereClause.OR = [{ courseId: null }, { courseId: { in: assignedCourseIds } }];
      }

      const announcements = await this.prisma.announcement.findMany({
        where: whereClause,
        include: {
          course: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const memoryMatches = MEMORY_ANNOUNCEMENTS.filter((a) => {
        if (a.instituteId !== instituteId) return false;
        if (courseId) return a.courseId === courseId;
        return true;
      });

      const dbIds = new Set(announcements.map((r) => r.id));
      const uniqueMemory = memoryMatches.filter((m) => !dbIds.has(m.id));
      return [...announcements, ...uniqueMemory];
    } catch (error) {
      return MEMORY_ANNOUNCEMENTS.filter((a) => {
        if (a.instituteId !== instituteId) return false;
        if (courseId) return a.courseId === courseId;
        return true;
      });
    }
  }

  async remove(instituteId: string, id: string) {
    try {
      await this.prisma.announcement.delete({ where: { id } });
    } catch (e) {
      this.logger.warn(`Database announcement delete failed for ${id}. Falling back to dev store.`);
    }
    const index = MEMORY_ANNOUNCEMENTS.findIndex((a) => a.id === id && a.instituteId === instituteId);
    if (index !== -1) {
      MEMORY_ANNOUNCEMENTS.splice(index, 1);
      syncAllDevStore();
    }

    return { message: 'Announcement deleted successfully' };
  }
}
