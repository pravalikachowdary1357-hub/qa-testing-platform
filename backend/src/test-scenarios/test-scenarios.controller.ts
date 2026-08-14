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
import { TestScenariosService } from './test-scenarios.service';
import { CreateTestScenarioDto } from './dto/create-test-scenario.dto';
import { UpdateTestScenarioDto } from './dto/update-test-scenario.dto';

@Controller('test-scenarios')
export class TestScenariosController {
  constructor(private readonly testScenariosService: TestScenariosService) {}

  @Get()
  findAll() {
    return this.testScenariosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testScenariosService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTestScenarioDto) {
    return this.testScenariosService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTestScenarioDto) {
    return this.testScenariosService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.testScenariosService.remove(id);
  }
}
