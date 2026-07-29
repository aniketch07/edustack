import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceRecordDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsBoolean()
  isPresent: boolean;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class MarkAttendanceDto {
  @IsString()
  @IsNotEmpty({ message: 'Date is required (e.g. 2026-07-28)' })
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}
