import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateMcqDto } from './dto/generate-mcq.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Generate MCQ questions via AI (NVIDIA NIM).
   * Only Institute Admins and Teachers can generate — students cannot.
   */
  @Post('generate-mcq')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.TEACHER)
  async generateMcq(@Body() dto: GenerateMcqDto) {
    const questions = await this.aiService.generateMcq(dto);
    return { message: 'MCQ questions generated', questions };
  }
}
