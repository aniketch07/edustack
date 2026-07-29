import { Controller, Post, Get, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
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
}
