import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { TestsService } from './tests.service';
import { CreateTestDto } from './dto/create-test.dto';
import { SubmitTestDto } from './dto/submit-test.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
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

  @Post('tests/:testId/submit')
  async submitAttempt(
    @Param('testId') testId: string,
    @GetUser('userId') studentId: string,
    @Body() submitTestDto: SubmitTestDto,
  ) {
    return this.testsService.submitAttempt(testId, studentId, submitTestDto);
  }
}
