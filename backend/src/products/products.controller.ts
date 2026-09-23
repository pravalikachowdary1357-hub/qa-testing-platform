import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { parseCsvBuffer } from '../common/csv/csv.util';
import { MAX_IMPORT_FILE_SIZE_BYTES } from '../common/import/import.constants';

const IMPORT_INTERCEPTOR = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMPORT_FILE_SIZE_BYTES },
});

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
  findAll(@CurrentUser() actor: AuthenticatedUser) {
    return this.productsService.findAll(actor.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.productsService.findOne(id, actor.organizationId);
  }

  // Unguarded for the same reason as the GET above: this is what the
  // Dashboard renders once it's scoped to a product, and the Dashboard
  // itself carries no permission gate today.
  @Get(':id/dashboard-summary')
  getDashboardSummary(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.productsService.getDashboardSummary(id, actor.organizationId);
  }

  @Post()
  @RequirePermission('products:write')
  create(@Body() dto: CreateProductDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.productsService.create(dto, actor);
  }

  @Patch(':id')
  @RequirePermission('products:write')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.productsService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('products:manage')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.productsService.remove(id, actor);
  }

  @Post('import')
  @RequirePermission('products:write')
  @UseInterceptors(IMPORT_INTERCEPTOR)
  bulkImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file || file.size === 0) {
      throw new BadRequestException('A non-empty CSV file is required.');
    }
    const rows = parseCsvBuffer(file.buffer);
    return this.productsService.bulkImport(rows, actor);
  }
}
