import { Controller, Post, Get, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { TestsService } from './tests.service';
import { CreateTestDto } from './dto/create-test.dto';
import { SubmitTestDto } from './dto/submit-test.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Post('courses/:courseId/tests')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.TEACHER)
  async create(
    @Param('courseId') courseId: string,
    @Body() createTestDto: CreateTestDto,
  ) {
    return this.testsService.create(courseId, createTestDto);
  }

  @Get('courses/:courseId/tests')
  async findByCourse(
    @Param('courseId') courseId: string,
    @GetUser('userId') studentId: string,
  ) {
    return this.testsService.findByCourse(courseId, studentId);
  }

  /**
   * Single-test fetch for the full-page test engine.
   * Staff get the correctAnswer; students get it stripped.
   */
  @Get('tests/:testId')
  async findOne(
    @Param('testId') testId: string,
    @GetUser() user: JwtPayload,
  ) {
    const isStaff =
      user.role === UserRole.INSTITUTE_ADMIN || user.role === UserRole.TEACHER;
    return this.testsService.findOne(testId, user.userId, isStaff);
  }

  @Post('tests/:testId/submit')
  async submitAttempt(
    @Param('testId') testId: string,
    @GetUser('userId') studentId: string,
    @Body() submitTestDto: SubmitTestDto,
  ) {
    return this.testsService.submitAttempt(testId, studentId, submitTestDto);
  }

  @Delete('courses/:courseId/tests/:testId')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.TEACHER)
  async remove(
    @Param('courseId') courseId: string,
    @Param('testId') testId: string,
  ) {
    return this.testsService.remove(courseId, testId);
  }
}
