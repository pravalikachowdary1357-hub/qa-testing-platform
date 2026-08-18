import { Module } from '@nestjs/common';
import { PerformanceTestingController } from './performance-testing.controller';
import { PerformanceTestingService } from './performance-testing.service';

@Module({
  controllers: [PerformanceTestingController],
  providers: [PerformanceTestingService],
})
export class PerformanceTestingModule {}
