import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateApprovalPolicyDto {
  @IsBoolean()
  requireCommentOnApprove: boolean;

  @IsBoolean()
  requireCommentOnReject: boolean;

  // Empty or omitted = any role holding the approval permission.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  approverRoleIds?: string[];
}
