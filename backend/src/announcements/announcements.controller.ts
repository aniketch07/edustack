import { Controller, Post, Get, Delete, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(UserRole.INSTITUTE_ADMIN)
  async create(
    @GetUser('instituteId') instituteId: string,
    @Body() createAnnouncementDto: CreateAnnouncementDto,
  ) {
    if (!instituteId) {
      throw new BadRequestException('Institute context missing');
    }
    return this.announcementsService.create(instituteId, createAnnouncementDto);
  }

  @Get()
  async findAllByInstitute(@GetUser('instituteId') instituteId: string) {
    if (!instituteId) {
      throw new BadRequestException('Institute context missing');
    }
    return this.announcementsService.findAllByInstitute(instituteId);
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
    return this.announcementsService.remove(instituteId, id);
  }
}
