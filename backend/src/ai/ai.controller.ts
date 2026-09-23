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
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { AiFeatureGuard } from './ai-feature.guard';
import { AiProviderExceptionFilter } from './ai-provider-exception.filter';
import {
  AnalyzeCoverageDto,
  AnalyzeExecutionDto,
  DefectTargetDto,
  DuplicateDefectsDto,
  ExplainReleaseRisksDto,
  GenerateScenariosDto,
  GenerateTestCasesDto,
  SuggestTestDataDto,
} from './dto/generate.dto';
import { ChatDto } from './dto/chat.dto';
import {
  AcceptScenariosDto,
  AcceptTestCasesDto,
  AcceptTestDataDto,
  ApplySeverityDto,
} from './dto/accept.dto';
import { ListSuggestionsQueryDto, UpdateSuggestionStatusDto } from './dto/suggestion-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('ai')
@UseGuards(AuthGuard, PermissionsGuard, AiFeatureGuard)
@UseFilters(AiProviderExceptionFilter)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  @RequirePermission('ai:read')
  getStatus() {
    return this.aiService.getStatus();
  }

  @Post('generate-scenarios')
  @RequirePermission('ai:use')
  generateScenarios(@Body() dto: GenerateScenariosDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.aiService.generateScenarios(dto, actor.organizationId);
  }

  @Post('generate-test-cases')
  @RequirePermission('ai:use')
  generateTestCases(@Body() dto: GenerateTestCasesDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.aiService.generateTestCases(dto, actor.organizationId);
  }

  @Post('suggest-test-data')
  @RequirePermission('ai:use')
  suggestTestData(@Body() dto: SuggestTestDataDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.aiService.suggestTestData(dto, actor.organizationId);
  }

  @Post('analyze-execution')
  @RequirePermission('ai:use')
  analyzeExecution(@Body() dto: AnalyzeExecutionDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.aiService.analyzeExecution(dto, actor.organizationId);
  }

  @Post('summarize-defect')
  @RequirePermission('ai:use')
  summarizeDefect(@Body() dto: DefectTargetDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.aiService.summarizeDefect(dto, actor.organizationId);
  }

  @Post('suggest-defect-severity')
  @RequirePermission('ai:use')
  suggestDefectSeverity(@Body() dto: DefectTargetDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.aiService.suggestDefectSeverity(dto, actor.organizationId);
  }

  @Post('duplicate-defects')
  @RequirePermission('ai:use')
  findDuplicateDefects(@Body() dto: DuplicateDefectsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.aiService.findDuplicateDefects(dto, actor.organizationId);
  }

  @Post('analyze-coverage')
  @RequirePermission('ai:use')
  analyzeCoverage(@Body() dto: AnalyzeCoverageDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.aiService.analyzeCoverage(dto, actor.organizationId);
  }

  @Post('explain-release-risks')
  @RequirePermission('ai:use')
  explainReleaseRisks(
    @Body() dto: ExplainReleaseRisksDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.aiService.explainReleaseRisks(dto, actor.organizationId);
  }

  @Post('chat')
  @RequirePermission('ai:use')
  chat(@Body() dto: ChatDto) {
    return this.aiService.chat(dto);
  }

  @Post('suggestions/:id/accept-scenarios')
  @RequirePermission('ai:use')
  acceptScenarios(
    @Param('id') id: string,
    @Body() dto: AcceptScenariosDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.aiService.acceptScenarios(id, dto, actor.organizationId);
  }

  @Post('suggestions/:id/accept-test-cases')
  @RequirePermission('ai:use')
  acceptTestCases(
    @Param('id') id: string,
    @Body() dto: AcceptTestCasesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.aiService.acceptTestCases(id, dto, actor.organizationId);
  }

  @Post('suggestions/:id/accept-test-data')
  @RequirePermission('ai:use')
  acceptTestData(
    @Param('id') id: string,
    @Body() dto: AcceptTestDataDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.aiService.acceptTestData(id, dto, actor.organizationId);
  }

  @Post('suggestions/:id/apply-severity')
  @RequirePermission('ai:use')
  applySeverity(
    @Param('id') id: string,
    @Body() dto: ApplySeverityDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.aiService.applySeverity(id, dto, actor.organizationId);
  }

  @Patch('suggestions/:id')
  @RequirePermission('ai:use')
  updateSuggestionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSuggestionStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.aiService.updateSuggestionStatus(id, dto, actor.organizationId);
  }

  @Get('suggestions')
  @RequirePermission('ai:read')
  listSuggestions(@Query() query: ListSuggestionsQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.aiService.listSuggestions(query, actor.organizationId);
  }

  @Get('suggestions/:id')
  @RequirePermission('ai:read')
  getSuggestion(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.aiService.getSuggestion(id, actor.organizationId);
  }

  @Delete('suggestions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('ai:manage')
  removeSuggestion(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.aiService.removeSuggestion(id, actor.organizationId);
  }
}
