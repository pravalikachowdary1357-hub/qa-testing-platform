import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TestPlansService } from './test-plans.service';
import { CreateTestPlanDto } from './dto/create-test-plan.dto';
import { UpdateTestPlanDto } from './dto/update-test-plan.dto';

@Controller('test-plans')
export class TestPlansController {
  constructor(private readonly testPlansService: TestPlansService) {}

  @Get()
  findAll() {
    return this.testPlansService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testPlansService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTestPlanDto) {
    return this.testPlansService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTestPlanDto) {
    return this.testPlansService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.testPlansService.remove(id);
  }
}
