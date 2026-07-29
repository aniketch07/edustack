import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLiveClassDto } from './dto/create-live-class.dto';
import { loadDevStore } from '../common/dev-store';
import { syncAllDevStore } from '../common/store-sync';
import { MEMORY_INSTITUTES, MEMORY_USERS } from '../institutes/institutes.service';
import { MEMORY_COURSES } from '../courses/courses.service';
import { MEMORY_ENROLLMENTS } from '../enrollments/enrollments.service';
import { MEMORY_LESSONS } from '../lessons/lessons.service';
import { MEMORY_ATTENDANCE } from '../attendance/attendance.service';
import { MEMORY_TESTS, MEMORY_QUESTIONS, MEMORY_TEST_ATTEMPTS } from '../tests/tests.service';
import { MEMORY_ANNOUNCEMENTS } from '../announcements/announcements.service';

export let MEMORY_LIVE_CLASSES: any[] = [];

const initialStore = loadDevStore();
if (initialStore.liveClasses) {
  MEMORY_LIVE_CLASSES.push(...initialStore.liveClasses);
}

@Injectable()
export class LiveClassesService implements OnModuleInit {
  private readonly logger = new Logger(LiveClassesService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const loaded = loadDevStore();
    MEMORY_LIVE_CLASSES.length = 0;
    if (loaded.liveClasses) {
      MEMORY_LIVE_CLASSES.push(...loaded.liveClasses);
    }
  }

  async create(courseId: string, createLiveClassDto: CreateLiveClassDto) {
    const { title, description, meetingLink, scheduledAt, duration } = createLiveClassDto;

    try {
      const liveClass = await this.prisma.liveClass.create({
        data: {
          courseId,
          title,
          description: description || null,
          meetingLink,
          scheduledAt: new Date(scheduledAt),
          duration,
        },
      });

      return {
        message: 'Live class scheduled successfully',
        liveClass,
      };
    } catch (error: any) {
      this.logger.warn(`Database live class scheduling failed. Using dev store for: ${title}`);
    }

    const newLiveClass = {
      id: `live-${Date.now()}`,
      courseId,
      title,
      description: description || null,
      meetingLink,
      scheduledAt: new Date(scheduledAt),
      duration,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    MEMORY_LIVE_CLASSES.push(newLiveClass);
    syncAllDevStore();

    return {
      message: 'Live class scheduled successfully (Dev Store)',
      liveClass: newLiveClass,
    };
  }

  async findByCourse(courseId: string, upcomingOnly: boolean = false) {
    const now = new Date();
    try {
      const liveClasses = await this.prisma.liveClass.findMany({
        where: {
          courseId,
          ...(upcomingOnly ? { scheduledAt: { gte: now } } : {}),
        },
        orderBy: { scheduledAt: 'asc' },
      });

      const memoryMatches = MEMORY_LIVE_CLASSES.filter(
        (l) => l.courseId === courseId && (!upcomingOnly || new Date(l.scheduledAt) >= now),
      );
      const dbIds = new Set(liveClasses.map((r) => r.id));
      const uniqueMemory = memoryMatches.filter((m) => !dbIds.has(m.id));
      return [...liveClasses, ...uniqueMemory];
    } catch (error) {
      return MEMORY_LIVE_CLASSES.filter(
        (l) => l.courseId === courseId && (!upcomingOnly || new Date(l.scheduledAt) >= now),
      );
    }
  }

  async remove(courseId: string, id: string) {
    try {
      await this.prisma.liveClass.delete({ where: { id } });
    } catch (e) {
      this.logger.warn(`Database live class remove failed for ${id}. Falling back to dev store.`);
    }
    const index = MEMORY_LIVE_CLASSES.findIndex((l) => l.id === id && l.courseId === courseId);
    if (index !== -1) {
      MEMORY_LIVE_CLASSES.splice(index, 1);
      syncAllDevStore();
    }

    return { message: 'Live class session cancelled successfully' };
  }
}
