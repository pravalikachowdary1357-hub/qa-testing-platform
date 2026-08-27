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
import { ProductComponentsService } from './product-components.service';
import { CreateProductComponentDto } from './dto/create-product-component.dto';
import { ListProductComponentsQueryDto } from './dto/list-product-components-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

// Sub-records of Product -- gated by Product's own permission keys rather
// than a new permission namespace, matching how the rest of the Product
// Workspace is scoped. GET carries no @RequirePermission for the same
// reason ProductsController's GET endpoints don't: "products:read" isn't
// broadly granted (only System Administrator has it per seed.cjs), and
// this is workspace detail shown alongside the always-visible Product
// Overview/Documents tabs -- gating it would 403 mid-workspace for anyone
// who can already view the product itself.
@Controller('product-components')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProductComponentsController {
  constructor(private readonly componentsService: ProductComponentsService) {}

  @Get()
  findAll(@Query() query: ListProductComponentsQueryDto) {
    return this.componentsService.findAll(query.productId);
  }

  @Post()
  @RequirePermission('products:write')
  create(@Body() dto: CreateProductComponentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.componentsService.create(dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('products:write')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.componentsService.remove(id, actor);
  }
}
