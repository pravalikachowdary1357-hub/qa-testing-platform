import { IsUUID } from 'class-validator';

export class ListProductTeamMembersQueryDto {
  @IsUUID()
  productId: string;
}
