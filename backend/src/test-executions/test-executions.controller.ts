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
import { TestExecutionsService } from './test-executions.service';
import { CreateTestExecutionDto } from './dto/create-test-execution.dto';
import { UpdateTestExecutionDto } from './dto/update-test-execution.dto';

@Controller('test-executions')
export class TestExecutionsController {
  constructor(private readonly testExecutionsService: TestExecutionsService) {}

  @Get()
  findAll() {
    return this.testExecutionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testExecutionsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTestExecutionDto) {
    return this.testExecutionsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTestExecutionDto) {
    return this.testExecutionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.testExecutionsService.remove(id);
  }
}
