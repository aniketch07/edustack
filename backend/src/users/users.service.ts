import { Injectable, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from '@prisma/client';
import { MEMORY_USERS, MEMORY_INSTITUTES } from '../institutes/institutes.service';
import { syncAllDevStore } from '../common/store-sync';
import { sanitizeText } from '../common/sanitize';
import { EmailService } from '../common/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Enforce the institute's plan seat limit for STUDENT account creation.
   * Only blocks creation — never deletes or modifies existing records.
   * - subscriptionStatus EXPIRED / SUSPENDED → blocks all new students
   * - studentLimit null → unlimited, no block
   * - active student count >= studentLimit → blocked
   */
  private async enforceStudentLimit(instituteId: string) {
    let institute: any = null;
    try {
      institute = await this.prisma.institute.findUnique({ where: { id: instituteId } });
    } catch (e) {
      institute = MEMORY_INSTITUTES.find((i) => i.id === instituteId) || null;
    }

    if (!institute) return; // no institute context — let the normal flow handle it

    const status = institute.subscriptionStatus || 'ACTIVE';
    if (status !== 'ACTIVE' && status !== 'TRIAL') {
      throw new BadRequestException(
        `Student account creation is paused. Your subscription is ${status}. Contact your platform administrator.`,
      );
    }

    const limit = institute.studentLimit ?? null;
    if (limit === null) return; // unlimited

    // Count ACTIVE students only — suspended/deleted don't consume seats
    let activeStudents = 0;
    try {
      activeStudents = await this.prisma.user.count({
        where: { instituteId, role: UserRole.STUDENT, isActive: true },
      });
    } catch (e) {
      activeStudents = MEMORY_USERS.filter(
        (u) => u.instituteId === instituteId && u.role === UserRole.STUDENT && u.isActive !== false,
      ).length;
    }

    if (activeStudents >= limit) {
      throw new BadRequestException(
        `Student seat limit reached (${limit}/${limit}). To add more students, contact your platform administrator to upgrade your plan.`,
      );
    }
  }

  async create(instituteId: string, createUserDto: CreateUserDto) {
    const { email, password, phone, role } = createUserDto;
    const firstName = sanitizeText(createUserDto.firstName);
    const lastName = sanitizeText(createUserDto.lastName);

    if (!instituteId) {
      throw new BadRequestException('User must belong to a valid institute');
    }

    if (role !== UserRole.TEACHER && role !== UserRole.STUDENT) {
      throw new BadRequestException('Institute Admins can only create TEACHER or STUDENT accounts');
    }

    // Seat limit only applies to STUDENT accounts
    if (role === UserRole.STUDENT) {
      await this.enforceStudentLimit(instituteId);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const existingUser = await this.prisma.user.findFirst({ where: { email, instituteId } });
      if (existingUser) {
        throw new ConflictException(`User with email '${email}' already exists in this institute`);
      }

      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role,
          instituteId,
        },
      });

      const { password: _, ...userWithoutPassword } = user;

      if (role === UserRole.STUDENT) {
        this.sendLoginEmail(instituteId, { firstName, lastName, email, password });
      }

      return {
        message: `${role} account created successfully`,
        user: userWithoutPassword,
      };
    } catch (error: any) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.warn(`Database offline during user creation. Using in-memory fallback for: ${email}`);

      if (MEMORY_USERS.some((u) => u.email === email && u.instituteId === instituteId)) {
        throw new ConflictException(`User with email '${email}' already exists in this institute`);
      }

      const inst = MEMORY_INSTITUTES.find((i) => i.id === instituteId) || null;

      const newUser = {
        id: `user-${Date.now()}`,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role,
        instituteId,
        institute: inst,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      MEMORY_USERS.push(newUser);
      syncAllDevStore();

      if (role === UserRole.STUDENT) {
        this.sendLoginEmail(instituteId, { firstName, lastName, email, password });
      }

      const { password: _, ...userWithoutPassword } = newUser;
      return {
        message: `${role} account created successfully (Dev Mode)`,
        user: userWithoutPassword,
      };
    }
  }

  async findByInstitute(instituteId: string, role?: UserRole) {
    try {
      const whereClause: any = { instituteId };
      if (role) whereClause.role = role;

      const users = await this.prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const memoryMatches = MEMORY_USERS.filter((u) => u.instituteId === instituteId && (!role || u.role === role)).map(
        ({ password, ...rest }) => rest,
      );

      const dbIds = new Set(users.map((r) => r.id));
      const uniqueMemory = memoryMatches.filter((m) => !dbIds.has(m.id));
      return [...users, ...uniqueMemory];
    } catch (error) {
      return MEMORY_USERS.filter((u) => u.instituteId === instituteId && (!role || u.role === role)).map(
        ({ password, ...rest }) => rest,
      );
    }
  }

  /** Fetch a raw user (no password stripping) for scoping checks. Returns null if not found. */
  async findRawUser(userId: string) {
    try {
      return await this.prisma.user.findUnique({ where: { id: userId } });
    } catch (e) {
      return MEMORY_USERS.find((u) => u.id === userId) || null;
    }
  }

  /**
   * Admin-triggered password reset. The target user is scoped by the controller
   * (SUPER_ADMIN can reset anyone; INSTITUTE_ADMIN only users in their institute).
   */
  async resetPassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });
      return { message: 'Password reset successfully', user: updated };
    } catch (error: any) {
      this.logger.warn(`Database password reset failed for user: ${userId}. Using dev store.`);

      const memUser = MEMORY_USERS.find((u) => u.id === userId);
      if (!memUser) {
        throw new BadRequestException('User not found');
      }
      memUser.password = hashedPassword;
      syncAllDevStore();

      const { password: _, ...rest } = memUser;
      return { message: 'Password reset successfully (Dev Store)', user: rest };
    }
  }

  async toggleUserStatus(userId: string, isActive: boolean) {
    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
      });
      return { message: `User account status updated to ${isActive ? 'ACTIVE' : 'SUSPENDED'}`, user: updated };
    } catch (error: any) {
      this.logger.warn(`Database status update failed for user: ${userId}. Using dev store.`);
      const memUser = MEMORY_USERS.find((u) => u.id === userId);
      if (!memUser) {
        throw new BadRequestException('User not found');
      }
      memUser.isActive = isActive;
      syncAllDevStore();

      const { password: _, ...rest } = memUser;
      return { message: `User account status updated to ${isActive ? 'ACTIVE' : 'SUSPENDED'} (Dev Store)`, user: rest };
    }
  }

  private async sendLoginEmail(instituteId: string, user: { firstName: string; lastName: string; email: string; password: string }) {
    let instituteName = 'Your Institute';
    try {
      const institute = await this.prisma.institute.findUnique({ where: { id: instituteId } });
      instituteName = institute?.name || MEMORY_INSTITUTES.find((i) => i.id === instituteId)?.name || 'Your Institute';
    } catch {
      instituteName = MEMORY_INSTITUTES.find((i) => i.id === instituteId)?.name || 'Your Institute';
    }

    try {
      await this.emailService.sendWelcomeEmail({
        toEmail: user.email,
        toName: `${user.firstName} ${user.lastName}`,
        instituteName,
        loginEmail: user.email,
        loginPassword: user.password,
      });
    } catch (error) {
      this.logger.warn(`Failed to send welcome email to ${user.email}: ${error}`);
    }
  }
}
