import { IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export type TestCaseReviewDecision =
  'APPROVED' | 'REJECTED' | 'RETURNED_FOR_REWORK';

export class ReviewTestCaseDto {
  @IsIn(['APPROVED', 'REJECTED', 'RETURNED_FOR_REWORK'])
  decision: TestCaseReviewDecision;

  // Required for a rejection or a rework request; optional for approval
  // (unless the configured approval policy requires it).
  @ValidateIf((dto: ReviewTestCaseDto) => dto.decision !== 'APPROVED')
  @IsString()
  @IsNotEmpty()
  comment?: string;
}
