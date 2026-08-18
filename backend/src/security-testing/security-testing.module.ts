import { Module } from '@nestjs/common';
import { SecurityTestingController } from './security-testing.controller';
import { SecurityTestingService } from './security-testing.service';

@Module({
  controllers: [SecurityTestingController],
  providers: [SecurityTestingService],
})
export class SecurityTestingModule {}
