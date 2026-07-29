import { Injectable, ConflictException, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstituteDto } from './dto/create-institute.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UserRole } from '@prisma/client';
import { loadDevStore } from '../common/dev-store';
import { syncAllDevStore } from '../common/store-sync';
import { sanitizeText } from '../common/sanitize';
import * as bcrypt from 'bcrypt';
import { MEMORY_COURSES } from '../courses/courses.service';

// Global shared store for offline fallback mode
export let MEMORY_INSTITUTES: any[] = [];
export let MEMORY_USERS: any[] = [];

// Load initial store from disk
const initialData = loadDevStore();
MEMORY_INSTITUTES.push(...initialData.institutes);
MEMORY_USERS.push(...initialData.users);

@Injectable()
export class InstitutesService implements OnModuleInit {
  private readonly logger = new Logger(InstitutesService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const loaded = loadDevStore();
    MEMORY_INSTITUTES.length = 0;
    MEMORY_USERS.length = 0;
    MEMORY_INSTITUTES.push(...loaded.institutes);
    MEMORY_USERS.push(...loaded.users);
  }

  async create(createDto: CreateInstituteDto) {
    const {
      name,
      slug,
      contactEmail,
      contactPhone,
      primaryColor,
      secondaryColor,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,
    } = createDto;

    const safeName = sanitizeText(name);

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    try {
      const existingSlug = await this.prisma.institute.findUnique({ where: { slug } });
      if (existingSlug) {
        throw new ConflictException(`Institute slug '${slug}' is already taken`);
      }

      const existingAdmin = await this.prisma.user.findFirst({ where: { email: adminEmail } });
      if (existingAdmin) {
        throw new ConflictException(`User with email '${adminEmail}' already exists`);
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const institute = await tx.institute.create({
          data: {
            name: safeName,
            slug,
            contactEmail,
            contactPhone,
            primaryColor: primaryColor || '#3B82F6',
            secondaryColor: secondaryColor || '#10B981',
          },
        });

        const admin = await tx.user.create({
          data: {
            email: adminEmail,
            password: hashedPassword,
            firstName: adminFirstName,
            lastName: adminLastName,
            role: UserRole.INSTITUTE_ADMIN,
            instituteId: institute.id,
          },
        });

        return { institute, admin };
      });

      return {
        message: 'Institute and Institute Admin onboarded successfully',
        institute: result.institute,
        admin: {
          id: result.admin.id,
          email: result.admin.email,
          firstName: result.admin.firstName,
          lastName: result.admin.lastName,
          role: result.admin.role,
        },
      };
    } catch (error: any) {
      if (error instanceof ConflictException) throw error;

      this.logger.warn(`Database offline during institute creation. Using persistent dev storage for: ${name}`);

      if (MEMORY_INSTITUTES.some((i) => i.slug === slug)) {
        throw new ConflictException(`Institute slug '${slug}' is already taken`);
      }
      if (MEMORY_USERS.some((u) => u.email === adminEmail)) {
        throw new ConflictException(`User with email '${adminEmail}' already exists`);
      }

      const newInstitute = {
        id: `inst-${Date.now()}`,
        name,
        slug,
        contactEmail,
        contactPhone,
        primaryColor: primaryColor || '#3B82F6',
        secondaryColor: secondaryColor || '#10B981',
        bannerImage: null,
        logoUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newAdmin = {
        id: `user-${Date.now()}`,
        email: adminEmail,
        password: hashedPassword,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: UserRole.INSTITUTE_ADMIN,
        instituteId: newInstitute.id,
        institute: newInstitute,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      MEMORY_INSTITUTES.push(newInstitute);
      MEMORY_USERS.push(newAdmin);
      syncAllDevStore();

      return {
        message: 'Institute and Institute Admin onboarded successfully (Dev Storage)',
        institute: newInstitute,
        admin: {
          id: newAdmin.id,
          email: newAdmin.email,
          firstName: newAdmin.firstName,
          lastName: newAdmin.lastName,
          role: newAdmin.role,
        },
      };
    }
  }

  async findAll() {
    try {
      const dbInstitutes = await this.prisma.institute.findMany({
        include: {
          users: {
            select: { id: true, role: true },
          },
          _count: {
            select: { courses: true, users: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formattedDb = dbInstitutes.map((inst) => {
        const teachersCount = inst.users.filter((u) => u.role === UserRole.TEACHER).length;
        const studentsCount = inst.users.filter((u) => u.role === UserRole.STUDENT).length;
        return {
          ...inst,
          teachersCount,
          studentsCount,
          coursesCount: inst._count.courses,
        };
      });

      const formattedMem = MEMORY_INSTITUTES.map((inst) => {
        const instUsers = MEMORY_USERS.filter((u) => u.instituteId === inst.id);
        const teachersCount = instUsers.filter((u) => u.role === UserRole.TEACHER).length;
        const studentsCount = instUsers.filter((u) => u.role === UserRole.STUDENT).length;
        const coursesCount = MEMORY_COURSES.filter((c) => c.instituteId === inst.id).length;
        return {
          ...inst,
          teachersCount,
          studentsCount,
          coursesCount,
        };
      });

      const dbIds = new Set(formattedDb.map((r) => r.id));
      const uniqueMem = formattedMem.filter((m) => !dbIds.has(m.id));
      const allInstitutes = [...formattedDb, ...uniqueMem];

      const totalTeachers = allInstitutes.reduce((acc, i) => acc + (i.teachersCount || 0), 0);
      const totalStudents = allInstitutes.reduce((acc, i) => acc + (i.studentsCount || 0), 0);
      const totalCourses = allInstitutes.reduce((acc, i) => acc + (i.coursesCount || 0), 0);

      return {
        totalInstitutes: allInstitutes.length,
        totalTeachers,
        totalStudents,
        totalCourses,
        institutes: allInstitutes,
      };
    } catch (error) {
      const formattedMem = MEMORY_INSTITUTES.map((inst) => {
        const instUsers = MEMORY_USERS.filter((u) => u.instituteId === inst.id);
        const teachersCount = instUsers.filter((u) => u.role === UserRole.TEACHER).length;
        const studentsCount = instUsers.filter((u) => u.role === UserRole.STUDENT).length;
        const coursesCount = MEMORY_COURSES.filter((c) => c.instituteId === inst.id).length;
        return {
          ...inst,
          teachersCount,
          studentsCount,
          coursesCount,
        };
      });

      const totalTeachers = formattedMem.reduce((acc, i) => acc + (i.teachersCount || 0), 0);
      const totalStudents = formattedMem.reduce((acc, i) => acc + (i.studentsCount || 0), 0);
      const totalCourses = formattedMem.reduce((acc, i) => acc + (i.coursesCount || 0), 0);

      return {
        totalInstitutes: formattedMem.length,
        totalTeachers,
        totalStudents,
        totalCourses,
        institutes: formattedMem,
      };
    }
  }

  async findOne(id: string) {
    try {
      const inst = await this.prisma.institute.findUnique({
        where: { id },
        include: {
          users: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          _count: { select: { courses: true } },
        },
      });
      if (inst) return inst;
    } catch (e) {
      this.logger.warn(`Database findOne failed for institute: ${id}. Falling back to dev store.`);
    }

    const memInst = MEMORY_INSTITUTES.find((i) => i.id === id);
    if (!memInst) throw new NotFoundException('Institute not found');

    const users = MEMORY_USERS.filter((u) => u.instituteId === id).map(({ password, ...rest }) => rest);
    return {
      ...memInst,
      users,
      _count: { courses: 0, users: users.length },
    };
  }

  async updateBranding(instituteId: string, dto: UpdateBrandingDto) {
    const { logoUrl, primaryColor, secondaryColor } = dto;

    try {
      const updated = await this.prisma.institute.update({
        where: { id: instituteId },
        data: {
          ...(logoUrl !== undefined && { logoUrl }),
          ...(primaryColor && { primaryColor }),
          ...(secondaryColor && { secondaryColor }),
        },
      });

      return {
        message: 'Institute branding updated successfully',
        institute: updated,
      };
    } catch (e) {
      this.logger.warn(`Database institute branding update failed. Using dev store for: ${instituteId}`);
    }

    const instIdx = MEMORY_INSTITUTES.findIndex((i) => i.id === instituteId);
    if (instIdx !== -1) {
      if (logoUrl !== undefined) MEMORY_INSTITUTES[instIdx].logoUrl = logoUrl;
      if (primaryColor) MEMORY_INSTITUTES[instIdx].primaryColor = primaryColor;
      if (secondaryColor) MEMORY_INSTITUTES[instIdx].secondaryColor = secondaryColor;
    }

    MEMORY_USERS.forEach((u) => {
      if (u.instituteId === instituteId && u.institute) {
        if (logoUrl !== undefined) u.institute.logoUrl = logoUrl;
        if (primaryColor) u.institute.primaryColor = primaryColor;
        if (secondaryColor) u.institute.secondaryColor = secondaryColor;
      }
    });

    syncAllDevStore();

    return {
      message: 'Institute branding updated successfully (Dev Store)',
      institute: MEMORY_INSTITUTES[instIdx] || { logoUrl, primaryColor, secondaryColor },
    };
  }

  async remove(id: string) {
    try {
      await this.prisma.$transaction([
        this.prisma.user.deleteMany({ where: { instituteId: id } }),
        this.prisma.institute.delete({ where: { id } }),
      ]);
    } catch (error) {
      this.logger.warn(`Database remove failed for institute: ${id}. Falling back to dev store.`);
    }

    const instIdx = MEMORY_INSTITUTES.findIndex((i) => i.id === id);
    if (instIdx !== -1) {
      MEMORY_INSTITUTES.splice(instIdx, 1);
    }
    for (let i = MEMORY_USERS.length - 1; i >= 0; i--) {
      if (MEMORY_USERS[i].instituteId === id) {
        MEMORY_USERS.splice(i, 1);
      }
    }
    syncAllDevStore();

    return { message: 'Institute deleted successfully' };
  }
}
