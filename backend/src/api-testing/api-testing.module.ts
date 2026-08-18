import { Module } from '@nestjs/common';
import { ApiTestingController } from './api-testing.controller';
import { ApiTestingService } from './api-testing.service';

@Module({
  controllers: [ApiTestingController],
  providers: [ApiTestingService],
})
export class ApiTestingModule {}
