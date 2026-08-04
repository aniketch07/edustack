import { IsInt, IsNotEmpty, IsOptional, IsString, IsIn, Min } from 'class-validator';

export const PLAN_NAMES = ['Starter', 'Growth', 'Enterprise', 'Custom'] as const;
export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'TRIAL', 'EXPIRED', 'SUSPENDED'] as const;

export class UpdatePlanDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(PLAN_NAMES, { message: 'planName must be one of: Starter, Growth, Enterprise, Custom' })
  planName: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  studentLimit?: number; // omit/null = unlimited

  @IsIn(SUBSCRIPTION_STATUSES, { message: 'subscriptionStatus must be ACTIVE, TRIAL, EXPIRED, or SUSPENDED' })
  @IsOptional()
  subscriptionStatus?: string;
}
