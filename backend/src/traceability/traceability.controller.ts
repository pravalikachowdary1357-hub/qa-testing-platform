import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TraceabilityService } from './traceability.service';
import { TraceabilityQueryDto } from './dto/traceability-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

@Controller('traceability')
@UseGuards(AuthGuard, PermissionsGuard)
export class TraceabilityController {
  constructor(private readonly traceabilityService: TraceabilityService) {}

  @Get()
  @RequirePermission('traceability:read')
  getMatrix(@Query() query: TraceabilityQueryDto) {
    return this.traceabilityService.getMatrix(query.productId);
  }
}
