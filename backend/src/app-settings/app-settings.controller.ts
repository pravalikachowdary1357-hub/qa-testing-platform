import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AppSettingsService } from './app-settings.service';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('app-settings')
@UseGuards(AuthGuard, PermissionsGuard)
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  @RequirePermission('app_settings:read')
  get() {
    return this.appSettingsService.get();
  }

  @Patch()
  @RequirePermission('app_settings:manage')
  update(
    @Body() dto: UpdateAppSettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.appSettingsService.update(dto, actor);
  }
}
