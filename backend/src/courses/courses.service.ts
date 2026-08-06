import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { loadDevStore } from '../common/dev-store';
import { syncAllDevStore } from '../common/store-sync';
import { sanitizeText } from '../common/sanitize';
import { MEMORY_INSTITUTES, MEMORY_USERS } from '../institutes/institutes.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export let MEMORY_COURSES: any[] = [];

// Initialize memory store on boot
const initialStore = loadDevStore();
if (initialStore.courses) {
  MEMORY_COURSES.push(...initialStore.courses);
}

@Injectable()
export class CoursesService implements OnModuleInit {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  onModuleInit() {
    const loaded = loadDevStore();
    MEMORY_COURSES.length = 0;
    if (loaded.courses) {
      MEMORY_COURSES.push(...loaded.courses);
    }
  }

  async create(instituteId: string, createCourseDto: CreateCourseDto) {
    const { price, thumbnailUrl, thumbnail, teacherId } = createCourseDto;
    const title = sanitizeText(createCourseDto.title);
    const description = sanitizeText(createCourseDto.description);
    const finalThumbnail = thumbnailUrl || thumbnail || null;

    if (!instituteId) {
      throw new BadRequestException('Course must belong to a valid institute');
    }

    try {
      let validTeacherId = teacherId;
      if (!validTeacherId) {
        const firstTeacher = await this.prisma.user.findFirst({
          where: { instituteId, role: UserRole.TEACHER },
        });
        if (firstTeacher) validTeacherId = firstTeacher.id;
        else throw new BadRequestException('No teacher found. Please add a teacher before creating a course.');
      }

      const course = await this.prisma.course.create({
        data: {
          title,
          description,
          price,
          thumbnail: finalThumbnail,
          teacherId: validTeacherId,
          instituteId,
        },
        include: {
          teacher: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { lessons: true, enrollments: true },
          },
        },
      });

      // Realtime emit: Notify institute staff and assigned teacher
      this.realtime.emitToInstitute(instituteId, 'course:created', { course });
      if (validTeacherId) {
        this.realtime.emitToUsers([validTeacherId], 'course:assigned', {
          courseId: course.id,
          courseTitle: course.title,
        });
      }

      return {
        message: 'Course created successfully',
        course,
      };
    } catch (error: any) {
      this.logger.warn(`Database query failed during course creation. Using dev store for: ${title}`);

      let teacherObj: any = null;
      if (teacherId) {
        const found = MEMORY_USERS.find((u) => u.id === teacherId);
        if (found) {
          teacherObj = {
            id: found.id,
            firstName: found.firstName,
            lastName: found.lastName,
            email: found.email,
          };
        }
      }

      const newCourse = {
        id: `course-${Date.now()}`,
        title,
        description,
        price,
        thumbnail: finalThumbnail,
        thumbnailUrl: finalThumbnail,
        isPublished: false,
        instituteId,
        teacherId: teacherId || null,
        teacher: teacherObj,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { lessons: 0, enrollments: 0 },
      };

      MEMORY_COURSES.push(newCourse);
      syncAllDevStore();

      return {
        message: 'Course created successfully (Dev Store)',
        course: newCourse,
      };
    }
  }

  async findAllByInstitute(instituteId: string) {
    try {
      const courses = await this.prisma.course.findMany({
        where: { instituteId },
        include: {
          teacher: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { lessons: true, enrollments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const memoryMatches = MEMORY_COURSES.filter((c) => c.instituteId === instituteId);
      const dbIds = new Set(courses.map((r) => r.id));
      const uniqueMemory = memoryMatches.filter((m) => !dbIds.has(m.id));
      return [...courses, ...uniqueMemory];
    } catch (error) {
      return MEMORY_COURSES.filter((c) => c.instituteId === instituteId);
    }
  }

  async findAssignedCourses(instituteId: string, teacherId: string) {
    try {
      const courses = await this.prisma.course.findMany({
        where: { instituteId, teacherId },
        include: {
          teacher: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { lessons: true, enrollments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const memoryMatches = MEMORY_COURSES.filter(
        (c) => c.instituteId === instituteId && (c.teacherId === teacherId || c.teacher?.id === teacherId),
      );
      const dbIds = new Set(courses.map((r) => r.id));
      const uniqueMemory = memoryMatches.filter((m) => !dbIds.has(m.id));
      return [...courses, ...uniqueMemory];
    } catch (error) {
      return MEMORY_COURSES.filter(
        (c) => c.instituteId === instituteId && (c.teacherId === teacherId || c.teacher?.id === teacherId),
      );
    }
  }

  async findOne(instituteId: string, id: string) {
    try {
      const course = await this.prisma.course.findFirst({
        where: { id, instituteId },
        include: {
          teacher: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          lessons: {
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { enrollments: true },
          },
        },
      });

      if (course) return course;
    } catch (e) {
      this.logger.warn(`Database findOne failed for course: ${id}. Falling back to dev store.`);
    }

    const memCourse = MEMORY_COURSES.find((c) => c.id === id && c.instituteId === instituteId);
    if (!memCourse) throw new NotFoundException(`Course with ID '${id}' not found`);

    return memCourse;
  }

  async update(instituteId: string, id: string, updateCourseDto: UpdateCourseDto, role?: UserRole) {
    // TEACHERs can only update content fields — not teacherId, price, or publishing status
    const filtered = role === UserRole.TEACHER
      ? Object.fromEntries(
          Object.entries(updateCourseDto).filter(
            ([key]) => !['teacherId', 'price', 'isPublished'].includes(key),
          ),
        ) as UpdateCourseDto
      : updateCourseDto;

    // Sanitize string fields to prevent XSS
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(filtered)) {
      if (['title', 'description', 'thumbnail'].includes(key) && typeof value === 'string') {
        sanitized[key] = sanitizeText(value);
      } else {
        sanitized[key] = value;
      }
    }

    if (Object.keys(sanitized).length === 0) {
      throw new BadRequestException('No editable fields provided');
    }

    try {
      const existing = await this.prisma.course.findFirst({ where: { id, instituteId } });
      if (existing) {
        const updated = await this.prisma.course.update({
          where: { id },
          data: sanitized,
          include: {
            teacher: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            _count: { select: { lessons: true, enrollments: true } },
          },
        });
        return { message: 'Course updated successfully', course: updated };
      }
    } catch (e) {
      this.logger.warn(`Database update failed for course: ${id}. Falling back to dev store.`);
    }
    const memIndex = MEMORY_COURSES.findIndex((c) => c.id === id && c.instituteId === instituteId);
    if (memIndex === -1) throw new NotFoundException(`Course with ID '${id}' not found`);

    MEMORY_COURSES[memIndex] = {
      ...MEMORY_COURSES[memIndex],
      ...sanitized,
      updatedAt: new Date(),
    };

    // Only process teacherId reassignment if the caller is allowed to set it
    if (updateCourseDto.teacherId && role !== UserRole.TEACHER) {
      const found = MEMORY_USERS.find((u) => u.id === updateCourseDto.teacherId);
      if (found) {
        MEMORY_COURSES[memIndex].teacher = {
          id: found.id,
          firstName: found.firstName,
          lastName: found.lastName,
          email: found.email,
        };
      }
    }

    syncAllDevStore();

    return { message: 'Course updated successfully (Dev Store)', course: MEMORY_COURSES[memIndex] };
  }

  async remove(instituteId: string, id: string) {
    try {
      const existing = await this.prisma.course.findFirst({ where: { id, instituteId } });
      if (existing) {
        // Cascade-delete dependents first to avoid FK constraint violations
        await this.prisma.testAttempt.deleteMany({ where: { test: { courseId: id } } });
        await this.prisma.test.deleteMany({ where: { courseId: id } });
        await this.prisma.lesson.deleteMany({ where: { courseId: id } });
        await this.prisma.enrollment.deleteMany({ where: { courseId: id } });
        await this.prisma.attendance.deleteMany({ where: { courseId: id } });
        await this.prisma.announcement.deleteMany({ where: { courseId: id } });
        await this.prisma.course.delete({ where: { id } });
        this.logger.log(`Course ${id} deleted from database with all dependents.`);
      }
    } catch (e: any) {
      // Re-throw genuine DB failures instead of silently returning success
      this.logger.error(`Database remove failed for course: ${id}. Error: ${e.message}`);
      throw e;
    }

    // Remove from memory store along with all dependents
    const memIndex = MEMORY_COURSES.findIndex((c) => c.id === id);
    if (memIndex !== -1) {
      MEMORY_COURSES.splice(memIndex, 1);
    }
    // Always sync to disk so the deletion survives server restart
    syncAllDevStore();

    // Realtime notification: Notify all clients in the institute that this course was deleted
    this.realtime.emitToInstitute(instituteId, 'course:deleted', { id });

    return { message: 'Course deleted successfully' };
  }
}
