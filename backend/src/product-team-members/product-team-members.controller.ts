import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductTeamMembersService } from './product-team-members.service';
import { CreateProductTeamMemberDto } from './dto/create-product-team-member.dto';
import { ListProductTeamMembersQueryDto } from './dto/list-product-team-members-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

// See product-components.controller.ts for why GET carries no
// @RequirePermission (same reasoning applies here).
@Controller('product-team-members')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProductTeamMembersController {
  constructor(private readonly teamMembersService: ProductTeamMembersService) {}

  @Get()
  findAll(@Query() query: ListProductTeamMembersQueryDto) {
    return this.teamMembersService.findAll(query.productId);
  }

  @Post()
  @RequirePermission('products:write')
  create(@Body() dto: CreateProductTeamMemberDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.teamMembersService.create(dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('products:write')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.teamMembersService.remove(id, actor);
  }
}
