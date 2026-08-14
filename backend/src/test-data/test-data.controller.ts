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
import { TestDataService } from './test-data.service';
import { CreateTestDataDto } from './dto/create-test-data.dto';
import { UpdateTestDataDto } from './dto/update-test-data.dto';

@Controller('test-data')
export class TestDataController {
  constructor(private readonly testDataService: TestDataService) {}

  @Get()
  findAll() {
    return this.testDataService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testDataService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTestDataDto) {
    return this.testDataService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTestDataDto) {
    return this.testDataService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.testDataService.remove(id);
  }
}
