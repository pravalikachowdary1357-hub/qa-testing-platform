import { IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export type ReviewDecision = 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_REWORK';

const REVIEW_DECISIONS: ReviewDecision[] = [
  'APPROVED',
  'REJECTED',
  'RETURNED_FOR_REWORK',
];

export class ReviewRequirementDto {
  @IsIn(REVIEW_DECISIONS)
  decision: ReviewDecision;

  // Required for a rejection or a rework request (the reviewer must explain
  // why); optional for a plain approval.
  @ValidateIf((dto: ReviewRequirementDto) => dto.decision !== 'APPROVED')
  @IsString()
  @IsNotEmpty()
  comment?: string;
}
