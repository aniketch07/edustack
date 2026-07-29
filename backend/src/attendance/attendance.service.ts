import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { loadDevStore } from '../common/dev-store';
import { syncAllDevStore } from '../common/store-sync';
import { MEMORY_INSTITUTES, MEMORY_USERS } from '../institutes/institutes.service';
import { MEMORY_COURSES } from '../courses/courses.service';
import { MEMORY_ENROLLMENTS } from '../enrollments/enrollments.service';
import { MEMORY_LESSONS } from '../lessons/lessons.service';

export let MEMORY_ATTENDANCE: any[] = [];

const initialStore = loadDevStore();
if (initialStore.attendances) {
  MEMORY_ATTENDANCE.push(...initialStore.attendances);
}

@Injectable()
export class AttendanceService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const loaded = loadDevStore();
    MEMORY_ATTENDANCE.length = 0;
    if (loaded.attendances) {
      MEMORY_ATTENDANCE.push(...loaded.attendances);
    }
  }

  async markAttendance(courseId: string, markAttendanceDto: MarkAttendanceDto) {
    const { date, records } = markAttendanceDto;
    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    try {
      const operations = records.map((r) =>
        this.prisma.attendance.upsert({
          where: {
            courseId_studentId_date: {
              courseId,
              studentId: r.studentId,
              date: targetDate,
            },
          },
          update: {
            isPresent: r.isPresent,
            remarks: r.remarks || null,
          },
          create: {
            courseId,
            studentId: r.studentId,
            date: targetDate,
            isPresent: r.isPresent,
            remarks: r.remarks || null,
          },
        }),
      );

      await this.prisma.$transaction(operations);
      return { message: 'Attendance marked successfully', date, count: records.length };
    } catch (error: any) {
      this.logger.warn(`Database attendance mark failed. Using dev store for course: ${courseId}`);
    }

    const dateStr = targetDate.toISOString().split('T')[0];

    records.forEach((r) => {
      const idx = MEMORY_ATTENDANCE.findIndex(
        (a) =>
          a.courseId === courseId &&
          a.studentId === r.studentId &&
          new Date(a.date).toISOString().split('T')[0] === dateStr,
      );

      const foundStudent = MEMORY_USERS.find((u) => u.id === r.studentId);

      const rec = {
        id: idx !== -1 ? MEMORY_ATTENDANCE[idx].id : `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        courseId,
        studentId: r.studentId,
        date: targetDate,
        isPresent: r.isPresent,
        remarks: r.remarks || null,
        student: foundStudent
          ? {
              id: foundStudent.id,
              firstName: foundStudent.firstName,
              lastName: foundStudent.lastName,
              email: foundStudent.email,
            }
          : null,
      };

      if (idx !== -1) {
        MEMORY_ATTENDANCE[idx] = rec;
      } else {
        MEMORY_ATTENDANCE.push(rec);
      }
    });

    syncAllDevStore();
    return { message: 'Attendance marked successfully (Dev Store)', date, count: records.length };
  }

  async getCourseAttendance(courseId: string, date?: string) {
    try {
      const whereClause: any = { courseId };
      if (date) {
        const targetDate = new Date(date);
        targetDate.setUTCHours(0, 0, 0, 0);
        whereClause.date = targetDate;
      }

      const records = await this.prisma.attendance.findMany({
        where: whereClause,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { date: 'desc' },
      });

      const memoryMatches = MEMORY_ATTENDANCE.filter((a) => {
        if (a.courseId !== courseId) return false;
        if (date) {
          return new Date(a.date).toISOString().split('T')[0] === new Date(date).toISOString().split('T')[0];
        }
        return true;
      });

      const dbIds = new Set(records.map((r) => r.id));
      const uniqueMemory = memoryMatches.filter((m) => !dbIds.has(m.id));
      return [...records, ...uniqueMemory];
    } catch (error) {
      return MEMORY_ATTENDANCE.filter((a) => a.courseId === courseId);
    }
  }

  async getStudentAttendance(studentId: string, courseId?: string) {
    try {
      const whereClause: any = { studentId };
      if (courseId) whereClause.courseId = courseId;

      const records = await this.prisma.attendance.findMany({
        where: whereClause,
        include: {
          course: { select: { id: true, title: true } },
        },
        orderBy: { date: 'desc' },
      });

      const memoryMatches = MEMORY_ATTENDANCE.filter(
        (a) => a.studentId === studentId && (!courseId || a.courseId === courseId),
      );

      const dbIds = new Set(records.map((r) => r.id));
      const uniqueMemory = memoryMatches.filter((m) => !dbIds.has(m.id));
      const combined = [...records, ...uniqueMemory];
      const totalSessions = combined.length;
      const presentSessions = combined.filter((r) => r.isPresent).length;
      const absentSessions = totalSessions - presentSessions;
      const percentage = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : null;

      return {
        totalSessions,
        presentSessions,
        absentSessions,
        percentage,
        records: combined,
      };
    } catch (error) {
      const memoryMatches = MEMORY_ATTENDANCE.filter(
        (a) => a.studentId === studentId && (!courseId || a.courseId === courseId),
      );
      const totalSessions = memoryMatches.length;
      const presentSessions = memoryMatches.filter((r) => r.isPresent).length;
      const absentSessions = totalSessions - presentSessions;
      const percentage = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : null;

      return {
        totalSessions,
        presentSessions,
        absentSessions,
        percentage,
        records: memoryMatches,
      };
    }
  }
}
