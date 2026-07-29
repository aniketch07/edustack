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
