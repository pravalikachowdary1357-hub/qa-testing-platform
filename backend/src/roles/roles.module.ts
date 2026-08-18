import { Module } from '@nestjs/common';
import { RolesController, PermissionsController } from './roles.controller';
import { RolesService } from './roles.service';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuthModule, AuditLogModule],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService],
})
export class RolesModule {}
