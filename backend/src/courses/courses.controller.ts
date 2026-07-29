import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.TEACHER)
  async create(
    @GetUser('instituteId') instituteId: string,
    @Body() createCourseDto: CreateCourseDto,
  ) {
    if (!instituteId) {
      throw new BadRequestException('User must belong to an active institute to create courses');
    }
    return this.coursesService.create(instituteId, createCourseDto);
  }

  @Get()
  async findAllByInstitute(
    @GetUser('instituteId') instituteId: string,
    @GetUser('userId') userId: string,
    @GetUser('role') role: UserRole,
  ) {
    if (!instituteId) {
      throw new BadRequestException('Institute context missing');
    }
    if (role === UserRole.TEACHER) {
      return this.coursesService.findAssignedCourses(instituteId, userId);
    }
    return this.coursesService.findAllByInstitute(instituteId);
  }

  @Get(':id')
  async findOne(
    @GetUser('instituteId') instituteId: string,
    @Param('id') id: string,
  ) {
    if (!instituteId) {
      throw new BadRequestException('Institute context missing');
    }
    return this.coursesService.findOne(instituteId, id);
  }

  @Patch(':id')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.TEACHER)
  async update(
    @GetUser('instituteId') instituteId: string,
    @GetUser('role') role: UserRole,
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    if (!instituteId) {
      throw new BadRequestException('Institute context missing');
    }
    return this.coursesService.update(instituteId, id, updateCourseDto, role);
  }

  @Delete(':id')
  @Roles(UserRole.INSTITUTE_ADMIN)
  async remove(
    @GetUser('instituteId') instituteId: string,
    @Param('id') id: string,
  ) {
    if (!instituteId) {
      throw new BadRequestException('Institute context missing');
    }
    return this.coursesService.remove(instituteId, id);
  }
}
