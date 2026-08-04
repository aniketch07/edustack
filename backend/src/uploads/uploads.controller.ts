import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { GetPresignedUrlDto } from './dto/get-presigned-url.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('presigned-url')
  @UseGuards(JwtAuthGuard)
  async getPresignedUrl(@Query() query: GetPresignedUrlDto) {
    return this.uploadsService.generatePresignedUrl(query);
  }

  @Post('dev-mock-upload')
  async handleDevMockUpload(@Query('key') key: string) {
    return {
      message: 'Dev Mock Upload Successful',
      key,
      status: 'success',
    };
  }
}
