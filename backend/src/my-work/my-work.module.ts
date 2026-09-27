import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReleaseQualityModule } from '../release-quality/release-quality.module';
import { MyWorkController } from './my-work.controller';
import { MyWorkService } from './my-work.service';

@Module({
  imports: [AuthModule, ReleaseQualityModule],
  controllers: [MyWorkController],
  providers: [MyWorkService],
})
export class MyWorkModule {}
