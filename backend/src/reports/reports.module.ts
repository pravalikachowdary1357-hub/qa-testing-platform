import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReleaseQualityModule } from '../release-quality/release-quality.module';

@Module({
  imports: [ReleaseQualityModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
