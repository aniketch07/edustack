import { Controller, Post, Get, Delete, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { EnrollStudentsDto } from './dto/enroll-students.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post('courses/:courseId/enrollments')
  @Roles(UserRole.INSTITUTE_ADMIN)
  async enrollStudents(
    @GetUser('instituteId') instituteId: string,
    @Param('courseId') courseId: string,
    @Body() enrollStudentsDto: EnrollStudentsDto,
  ) {
    if (!instituteId) {
      throw new BadRequestException('Institute context missing');
    }
    return this.enrollmentsService.enrollStudents(instituteId, courseId, enrollStudentsDto.studentIds);
  }

  @Get('courses/:courseId/enrollments')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.TEACHER)
  async getCourseEnrollments(
    @GetUser('instituteId') instituteId: string,
    @Param('courseId') courseId: string,
  ) {
    if (!instituteId) {
      throw new BadRequestException('Institute context missing');
    }
    return this.enrollmentsService.getCourseEnrollments(instituteId, courseId);
  }

  @Get('students/me/courses')
  async getMyCourses(@GetUser('userId') studentId: string) {
    return this.enrollmentsService.getStudentEnrolledCourses(studentId);
  }

  @Delete('courses/:courseId/enrollments/:studentId')
  @Roles(UserRole.INSTITUTE_ADMIN)
  async unenrollStudent(
    @GetUser('instituteId') instituteId: string,
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
  ) {
    if (!instituteId) {
      throw new BadRequestException('Institute context missing');
    }
    return this.enrollmentsService.unenrollStudent(instituteId, courseId, studentId);
  }
}
