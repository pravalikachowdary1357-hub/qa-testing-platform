import { IsBoolean } from 'class-validator';

export class UpdateApprovalPolicyDto {
  @IsBoolean()
  requireCommentOnApprove: boolean;

  @IsBoolean()
  requireCommentOnReject: boolean;
}
