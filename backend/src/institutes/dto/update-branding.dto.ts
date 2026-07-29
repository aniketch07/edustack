import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateBrandingDto {
  @IsString()
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Logo URL must be a valid HTTP/HTTPS image URL' })
  logoUrl?: string;

  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsString()
  @IsOptional()
  secondaryColor?: string;
}
