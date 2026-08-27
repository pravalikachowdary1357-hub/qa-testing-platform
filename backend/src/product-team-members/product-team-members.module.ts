import { Module } from '@nestjs/common';
import { ProductTeamMembersController } from './product-team-members.controller';
import { ProductTeamMembersService } from './product-team-members.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [ProductTeamMembersController],
  providers: [ProductTeamMembersService],
})
export class ProductTeamMembersModule {}
