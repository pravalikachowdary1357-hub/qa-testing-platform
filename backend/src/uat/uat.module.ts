import { Module } from '@nestjs/common';
import { UatController } from './uat.controller';
import { UatService } from './uat.service';

@Module({
  controllers: [UatController],
  providers: [UatService],
})
export class UatModule {}
