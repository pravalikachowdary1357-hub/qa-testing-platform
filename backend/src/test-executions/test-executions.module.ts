import { Module } from '@nestjs/common';
import { TestExecutionsController } from './test-executions.controller';
import { TestExecutionsService } from './test-executions.service';

@Module({
  controllers: [TestExecutionsController],
  providers: [TestExecutionsService],
})
export class TestExecutionsModule {}
