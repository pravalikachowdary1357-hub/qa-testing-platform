import { Controller, Post, UseGuards } from '@nestjs/common';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

@Controller('admin-bootstrap')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminBootstrapController {
  constructor(private readonly adminBootstrapService: AdminBootstrapService) {}

  @Post('missing-permissions')
  @RequirePermission('roles:manage')
  bootstrapMissingPermissions() {
    return this.adminBootstrapService.bootstrapMissingPermissions();
  }
}
