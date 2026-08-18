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
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';

// GET (list/detail) intentionally carries no @RequirePermission: nearly
// every module's data is scoped by product, so the product catalog is
// baseline navigation plumbing every authenticated user needs (the header
// ProductSwitcher and per-module product filters all read from here) --
// the same category as the unguarded Dashboard, not a gated capability.
// "products:read" still exists and still gates the Products admin PAGE
// itself (sidebar visibility + direct-route access, both permission-
// checked on the frontend); it just isn't re-enforced on this endpoint.
// Only the catalog's write/delete actions -- the actual "administer
// Products" capability the role matrix restricts -- require a permission.
@Controller('products')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @RequirePermission('products:write')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('products:write')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('products:manage')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
