import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.INSTITUTE_ADMIN)
  async create(
    @GetUser('instituteId') instituteId: string,
    @Body() createUserDto: CreateUserDto,
  ) {
    if (!instituteId) {
      throw new BadRequestException('Institute Admin must belong to an active institute');
    }
    return this.usersService.create(instituteId, createUserDto);
  }

  @Get()
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.TEACHER)
  async findByInstitute(
    @GetUser('instituteId') instituteId: string,
    @Query('role') role?: UserRole,
  ) {
    if (!instituteId) {
      throw new BadRequestException('Institute context missing');
    }
    return this.usersService.findByInstitute(instituteId, role);
  }

  /**
   * Admin password reset.
   * - SUPER_ADMIN can reset any user (no institute scope).
   * - INSTITUTE_ADMIN can only reset users inside their own institute.
   */
  @Patch(':id/password')
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN)
  async resetPassword(
    @GetUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    if (user.role === UserRole.INSTITUTE_ADMIN) {
      // Scope check: ensure the target user belongs to this admin's institute.
      const target = await this.usersService.findRawUser(id);
      if (!target || target.instituteId !== user.instituteId) {
        throw new BadRequestException('User not found in your institute');
      }
    }
    return this.usersService.resetPassword(id, dto.newPassword);
  }

  /**
   * Account Status Toggle (Active / Suspended).
   * - SUPER_ADMIN can toggle any user.
   * - INSTITUTE_ADMIN can only toggle users in their own institute.
   */
  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTITUTE_ADMIN)
  async toggleStatus(
    @GetUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    if (typeof isActive !== 'boolean') {
      throw new BadRequestException('isActive must be a boolean');
    }
    if (user.role === UserRole.INSTITUTE_ADMIN) {
      const target = await this.usersService.findRawUser(id);
      if (!target || target.instituteId !== user.instituteId) {
        throw new BadRequestException('User not found in your institute');
      }
    }
    return this.usersService.toggleUserStatus(id, isActive);
  }
}
