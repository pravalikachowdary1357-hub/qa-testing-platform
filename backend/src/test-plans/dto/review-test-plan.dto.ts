import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export type TestPlanReviewDecision =
  'APPROVED' | 'REJECTED' | 'RETURNED_FOR_REWORK';

export class ReviewTestPlanDto {
  @IsIn(['APPROVED', 'REJECTED', 'RETURNED_FOR_REWORK'])
  decision: TestPlanReviewDecision;

  // Required for a rejection or a rework request; optional for approval
  // (unless the configured approval policy requires it).
  @ValidateIf((dto: ReviewTestPlanDto) => dto.decision !== 'APPROVED')
  @IsString()
  @IsNotEmpty()
  comment?: string;
}

export class CompleteTestPlanDto {
  // The Test Manager's statement that the exit (completion) criteria are met.
  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
