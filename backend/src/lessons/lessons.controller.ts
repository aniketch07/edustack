import { Controller, Post, Get, Delete, Param, Body, UseGuards, NotFoundException, BadRequestException, Res } from '@nestjs/common';
import type { Response } from 'express';
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

  /**
   * Streams a lesson's PDF as an attachment download.
   * Keeps the raw S3 URL hidden and forces a direct download.
   */
  @Get('lessons/:lessonId/pdf')
  async downloadPdf(@Param('lessonId') lessonId: string, @Res() res: Response) {
    const pdfUrl = await this.lessonsService.findPdfUrl(lessonId);
    if (!pdfUrl) throw new NotFoundException('PDF not found for this lesson');

    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new BadRequestException('Could not fetch PDF file');
      const buffer = Buffer.from(await response.arrayBuffer());

      // Derive a friendly filename from the URL
      const filename = decodeURIComponent(pdfUrl.split('/').pop() || 'notes.pdf');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (e: any) {
      throw new BadRequestException(`Failed to download PDF: ${e.message}`);
    }
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
