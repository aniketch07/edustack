import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { InstitutesService } from './institutes.service';
import { CreateInstituteDto } from './dto/create-institute.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('institutes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstitutesController {
  constructor(private readonly institutesService: InstitutesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() createInstituteDto: CreateInstituteDto) {
    return this.institutesService.create(createInstituteDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  async findAll() {
    return this.institutesService.findAll();
  }

  // ⚠️ ORDER MATTERS: static routes MUST stay declared BEFORE @Get(':id') below.
  // NestJS matches routes in declaration order — if ':id' came first it would capture
  // 'analytics/overview' and 'system/settings' as an institute id and 404.
  @Get('analytics/overview')
  @Roles(UserRole.SUPER_ADMIN)
  async getAnalyticsOverview() {
    return this.institutesService.getAnalyticsOverview();
  }

  @Get('system/settings')
  @Roles(UserRole.SUPER_ADMIN)
  async getSystemSettings() {
    return this.institutesService.getSystemSettings();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async findOne(@Param('id') id: string) {
    return this.institutesService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN)
  async toggleStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.institutesService.toggleInstituteStatus(id, isActive);
  }

  @Patch(':id/plan')
  @Roles(UserRole.SUPER_ADMIN)
  async updatePlan(
    @Param('id') id: string,
    @Body() updatePlanDto: UpdatePlanDto,
  ) {
    return this.institutesService.updateInstitutePlan(id, updatePlanDto);
  }

  @Patch('me/branding')
  @Roles(UserRole.INSTITUTE_ADMIN)
  async updateBranding(
    @GetUser('instituteId') instituteId: string,
    @Body() updateBrandingDto: UpdateBrandingDto,
  ) {
    if (!instituteId) {
      throw new BadRequestException('Institute context missing');
    }
    return this.institutesService.updateBranding(instituteId, updateBrandingDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    return this.institutesService.remove(id);
  }
}
