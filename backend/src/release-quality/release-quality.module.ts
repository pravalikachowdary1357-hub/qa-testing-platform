import { Module } from '@nestjs/common';
import { ReleaseQualityController } from './release-quality.controller';
import { ReleaseQualityService } from './release-quality.service';

@Module({
  controllers: [ReleaseQualityController],
  providers: [ReleaseQualityService],
  // Exported so the read-only Reports module can reuse the exact same live
  // quality-gate computation instead of duplicating its threshold logic.
  exports: [ReleaseQualityService],
})
export class ReleaseQualityModule {}
