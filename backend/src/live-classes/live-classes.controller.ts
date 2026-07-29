import { Controller, Post, Get, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { LiveClassesService } from './live-classes.service';
import { CreateLiveClassDto } from './dto/create-live-class.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('courses/:courseId/live-classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LiveClassesController {
  constructor(private readonly liveClassesService: LiveClassesService) {}

  @Post()
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.TEACHER)
  async create(
    @Param('courseId') courseId: string,
    @Body() createLiveClassDto: CreateLiveClassDto,
  ) {
    return this.liveClassesService.create(courseId, createLiveClassDto);
  }

  @Get()
  async findByCourse(
    @Param('courseId') courseId: string,
    @Query('upcoming') upcoming?: string,
  ) {
    return this.liveClassesService.findByCourse(courseId, upcoming === 'true');
  }

  @Delete(':id')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.TEACHER)
  async remove(
    @Param('courseId') courseId: string,
    @Param('id') id: string,
  ) {
    return this.liveClassesService.remove(courseId, id);
  }
}
