import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiProviderService } from './ai-provider.service';
import { ReleaseQualityModule } from '../release-quality/release-quality.module';

@Module({
  imports: [ReleaseQualityModule],
  controllers: [AiController],
  providers: [AiService, AiProviderService],
})
export class AiModule {}
