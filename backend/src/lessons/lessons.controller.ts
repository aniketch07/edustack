import { Controller, Post, Get, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post('courses/:courseId/lessons')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.TEACHER)
  async create(
    @Param('courseId') courseId: string,
    @Body() createLessonDto: CreateLessonDto,
  ) {
    return this.lessonsService.create(courseId, createLessonDto);
  }

  @Get('courses/:courseId/lessons')
  async findByCourse(@Param('courseId') courseId: string) {
    return this.lessonsService.findByCourse(courseId);
  }

  @Post('lessons/:lessonId/progress')
  async updateProgress(
    @GetUser('userId') studentId: string,
    @Param('lessonId') lessonId: string,
    @Body() updateProgressDto: UpdateProgressDto,
  ) {
    return this.lessonsService.updateProgress(studentId, lessonId, updateProgressDto);
  }

  @Get('courses/:courseId/progress')
  async getCourseProgress(
    @GetUser('userId') studentId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.lessonsService.getCourseProgress(studentId, courseId);
  }

  @Delete('courses/:courseId/lessons/:id')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.TEACHER)
  async remove(
    @Param('courseId') courseId: string,
    @Param('id') id: string,
  ) {
    return this.lessonsService.remove(courseId, id);
  }
}
