import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { MyWorkService } from './my-work.service';
import { ModuleStatsService } from './module-stats.service';

// GET /dashboard/my-work?productId=... -- the signed-in user's role
// dashboard. Data is limited by the user's own permissions inside the
// service, so no single permission gates the route.
@Controller('dashboard')
@UseGuards(AuthGuard, PermissionsGuard)
export class MyWorkController {
  constructor(
    private readonly service: MyWorkService,
    private readonly moduleStats: ModuleStatsService,
  ) {}

  @Get('my-work')
  myWork(
    @Query('productId') productId: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.get(actor, productId || undefined);
  }

  // GET /dashboard/module-stats?module=defects&productId=... -- the four
  // summary figures shown at the top of a module page. Gated by the
  // module's own read permission inside the service.
  @Get('module-stats')
  moduleStatsFor(
    @Query('module') module: string,
    @Query('productId') productId: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.moduleStats.get(actor, module ?? '', productId || undefined);
  }
}
