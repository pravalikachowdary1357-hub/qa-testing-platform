import { Module } from '@nestjs/common';
import { TestScenariosController } from './test-scenarios.controller';
import { TestScenariosService } from './test-scenarios.service';

@Module({
  controllers: [TestScenariosController],
  providers: [TestScenariosService],
})
export class TestScenariosModule {}
