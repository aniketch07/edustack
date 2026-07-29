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
    const { isPublished } = createAnnouncementDto;
    const title = sanitizeText(createAnnouncementDto.title);
    const content = sanitizeText(createAnnouncementDto.content);

    try {
      const announcement = await this.prisma.announcement.create({
        data: {
          instituteId,
          title,
          content,
          isPublished: isPublished ?? true,
        },
      });

      return {
        message: 'Announcement published successfully',
        announcement,
      };
    } catch (error: any) {
      this.logger.warn(`Database announcement create failed. Using dev store for: ${title}`);
    }

    const newAnnouncement = {
      id: `ann-${Date.now()}`,
      instituteId,
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

  async findAllByInstitute(instituteId: string) {
    try {
      const announcements = await this.prisma.announcement.findMany({
        where: { instituteId },
        orderBy: { createdAt: 'desc' },
      });

      const memoryMatches = MEMORY_ANNOUNCEMENTS.filter((a) => a.instituteId === instituteId);
      const dbIds = new Set(announcements.map((r) => r.id));
      const uniqueMemory = memoryMatches.filter((m) => !dbIds.has(m.id));
      return [...announcements, ...uniqueMemory];
    } catch (error) {
      return MEMORY_ANNOUNCEMENTS.filter((a) => a.instituteId === instituteId);
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
