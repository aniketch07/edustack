import { Controller, Post, Get, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('courses/:courseId/attendance')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.TEACHER)
  async markAttendance(
    @Param('courseId') courseId: string,
    @Body() markAttendanceDto: MarkAttendanceDto,
  ) {
    return this.attendanceService.markAttendance(courseId, markAttendanceDto);
  }

  @Get('courses/:courseId/attendance')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.TEACHER)
  async getCourseAttendance(
    @Param('courseId') courseId: string,
    @Query('date') date?: string,
  ) {
    return this.attendanceService.getCourseAttendance(courseId, date);
  }

  @Get('students/me/attendance')
  async getMyAttendance(
    @GetUser('userId') studentId: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.attendanceService.getStudentAttendance(studentId, courseId);
  }
}
