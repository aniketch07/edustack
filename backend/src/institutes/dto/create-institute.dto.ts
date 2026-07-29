import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class CreateInstituteDto {
  @IsString()
  @IsNotEmpty({ message: 'Institute name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Slug is required' })
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must contain only lowercase letters, numbers, and hyphens' })
  slug: string;

  @IsEmail({}, { message: 'Invalid contact email format' })
  @IsNotEmpty({ message: 'Contact email is required' })
  contactEmail: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsString()
  @IsOptional()
  secondaryColor?: string;

  // Initial Institute Admin Account Details
  @IsEmail({}, { message: 'Invalid admin email format' })
  @IsNotEmpty({ message: 'Admin email is required' })
  adminEmail: string;

  @IsString()
  @IsNotEmpty({ message: 'Admin password is required' })
  @MinLength(6, { message: 'Admin password must be at least 6 characters' })
  adminPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Admin first name is required' })
  adminFirstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Admin last name is required' })
  adminLastName: string;
}
