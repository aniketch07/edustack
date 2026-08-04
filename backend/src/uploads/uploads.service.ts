import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetPresignedUrlDto, UploadFolder } from './dto/get-presigned-url.dto';

const ALLOWED_CONTENT_TYPES: Record<string, { maxSize: number; ext: string }> = {
  'video/mp4': { maxSize: 500 * 1024 * 1024, ext: '.mp4' },
  'video/webm': { maxSize: 500 * 1024 * 1024, ext: '.webm' },
  'application/pdf': { maxSize: 50 * 1024 * 1024, ext: '.pdf' },
  'image/png': { maxSize: 25 * 1024 * 1024, ext: '.png' },
  'image/jpeg': { maxSize: 25 * 1024 * 1024, ext: '.jpg' },
  'image/webp': { maxSize: 25 * 1024 * 1024, ext: '.webp' },
};

const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly publicDomain: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') || process.env.AWS_REGION || 'ap-south-1';
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME') || process.env.AWS_S3_BUCKET_NAME || 'edustack-storage';
    this.publicDomain = (this.configService.get<string>('AWS_S3_PUBLIC_DOMAIN') || process.env.AWS_S3_PUBLIC_DOMAIN || '').replace(/\/$/, '');

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID') || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || process.env.AWS_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  /**
   * Real S3 storage metrics — lists objects in the bucket and sums sizes.
   * Falls back to `null` when S3 is not configured or the listing fails,
   * so callers can decide what to show.
   */
  async getStorageStats(): Promise<{ totalObjects: number; totalBytes: number } | null> {
    if (!this.s3Client) return null;

    try {
      let totalObjects = 0;
      let totalBytes = 0;
      let continuationToken: string | undefined;

      do {
        const result = await this.s3Client.send(
          new ListObjectsV2Command({
            Bucket: this.bucketName,
            ContinuationToken: continuationToken,
          }),
        );
        totalObjects += result.KeyCount || 0;
        for (const obj of result.Contents || []) {
          totalBytes += obj.Size || 0;
        }
        continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
      } while (continuationToken);

      return { totalObjects, totalBytes };
    } catch (error: any) {
      this.logger.warn(`S3 storage stats listing failed: ${error.message}`);
      return null;
    }
  }

  async generatePresignedUrl(dto: GetPresignedUrlDto) {
    const { filename, contentType, folder = UploadFolder.LESSONS } = dto;

    if (!filename || !contentType) {
      throw new BadRequestException('filename and contentType are required');
    }

    // 1. Validate content type
    const typeConfig = ALLOWED_CONTENT_TYPES[contentType];
    if (!typeConfig) {
      const allowed = Object.keys(ALLOWED_CONTENT_TYPES).join(', ');
      throw new BadRequestException(
        `Content type '${contentType}' is not supported. Allowed: ${allowed}`,
      );
    }

    // 2. Sanitize filename and build key
    const ext = filename.includes('.') ? '.' + filename.split('.').pop()?.toLowerCase() : typeConfig.ext;
    const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileKey = `${folder}/${Date.now()}-${baseName}${ext}`;

    // 3. Fallback when AWS credentials are not configured
    if (!this.s3Client) {
      this.logger.warn('AWS credentials not configured. Returning dev fallback upload URL.');
      return {
        message: 'Pre-signed URL generated (Dev Fallback)',
        uploadUrl: `/uploads/dev-mock-upload?key=${encodeURIComponent(fileKey)}`,
        fileKey,
        publicUrl: `/uploads/${fileKey}`,
        expiresIn: 900,
        maxSizeBytes: typeConfig.maxSize,
        isDevFallback: true,
      };
    }

    // 4. Generate pre-signed URL — longer expiry for large video files
    const expiresIn = VIDEO_TYPES.has(contentType) ? 3600 : 900; // 60 min for video, 15 min for others

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

      // Build the public CDN URL
      let publicUrl: string;
      if (this.publicDomain) {
        publicUrl = `${this.publicDomain}/${fileKey}`;
      } else {
        // Default to standard S3 URL (requires public-read bucket policy or ACL)
        publicUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileKey}`;
      }

      return {
        message: 'AWS S3 pre-signed URL generated',
        uploadUrl,
        fileKey,
        publicUrl,
        expiresIn,
        maxSizeBytes: typeConfig.maxSize,
        isDevFallback: false,
      };
    } catch (error: any) {
      this.logger.error(`Failed to generate S3 pre-signed URL: ${error.message}`);
      throw new BadRequestException(`Could not generate upload URL: ${error.message}`);
    }
  }
}
