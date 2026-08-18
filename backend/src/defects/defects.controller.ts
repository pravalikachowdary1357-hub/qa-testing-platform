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
  Query,
  UseGuards,
} from '@nestjs/common';
import { DefectsService } from './defects.service';
import { CreateDefectDto } from './dto/create-defect.dto';
import { UpdateDefectDto } from './dto/update-defect.dto';
import { ListDefectsQueryDto } from './dto/list-defects-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

@Controller('defects')
@UseGuards(AuthGuard, PermissionsGuard)
export class DefectsController {
  constructor(private readonly defectsService: DefectsService) {}

  @Get()
  @RequirePermission('defects:read')
  findAll(@Query() query: ListDefectsQueryDto) {
    return this.defectsService.findAll(query.productId);
  }

  @Get(':id')
  @RequirePermission('defects:read')
  findOne(@Param('id') id: string) {
    return this.defectsService.findOne(id);
  }

  @Post()
  @RequirePermission('defects:write')
  create(@Body() dto: CreateDefectDto) {
    return this.defectsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('defects:write')
  update(@Param('id') id: string, @Body() dto: UpdateDefectDto) {
    return this.defectsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('defects:manage')
  remove(@Param('id') id: string) {
    return this.defectsService.remove(id);
  }
}
