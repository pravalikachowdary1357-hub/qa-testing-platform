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
  generateScenarios(@Body() dto: GenerateScenariosDto) {
    return this.aiService.generateScenarios(dto);
  }

  @Post('generate-test-cases')
  @RequirePermission('ai:use')
  generateTestCases(@Body() dto: GenerateTestCasesDto) {
    return this.aiService.generateTestCases(dto);
  }

  @Post('suggest-test-data')
  @RequirePermission('ai:use')
  suggestTestData(@Body() dto: SuggestTestDataDto) {
    return this.aiService.suggestTestData(dto);
  }

  @Post('analyze-execution')
  @RequirePermission('ai:use')
  analyzeExecution(@Body() dto: AnalyzeExecutionDto) {
    return this.aiService.analyzeExecution(dto);
  }

  @Post('summarize-defect')
  @RequirePermission('ai:use')
  summarizeDefect(@Body() dto: DefectTargetDto) {
    return this.aiService.summarizeDefect(dto);
  }

  @Post('suggest-defect-severity')
  @RequirePermission('ai:use')
  suggestDefectSeverity(@Body() dto: DefectTargetDto) {
    return this.aiService.suggestDefectSeverity(dto);
  }

  @Post('duplicate-defects')
  @RequirePermission('ai:use')
  findDuplicateDefects(@Body() dto: DuplicateDefectsDto) {
    return this.aiService.findDuplicateDefects(dto);
  }

  @Post('analyze-coverage')
  @RequirePermission('ai:use')
  analyzeCoverage(@Body() dto: AnalyzeCoverageDto) {
    return this.aiService.analyzeCoverage(dto);
  }

  @Post('explain-release-risks')
  @RequirePermission('ai:use')
  explainReleaseRisks(@Body() dto: ExplainReleaseRisksDto) {
    return this.aiService.explainReleaseRisks(dto);
  }

  @Post('chat')
  @RequirePermission('ai:use')
  chat(@Body() dto: ChatDto) {
    return this.aiService.chat(dto);
  }

  @Post('suggestions/:id/accept-scenarios')
  @RequirePermission('ai:use')
  acceptScenarios(@Param('id') id: string, @Body() dto: AcceptScenariosDto) {
    return this.aiService.acceptScenarios(id, dto);
  }

  @Post('suggestions/:id/accept-test-cases')
  @RequirePermission('ai:use')
  acceptTestCases(@Param('id') id: string, @Body() dto: AcceptTestCasesDto) {
    return this.aiService.acceptTestCases(id, dto);
  }

  @Post('suggestions/:id/accept-test-data')
  @RequirePermission('ai:use')
  acceptTestData(@Param('id') id: string, @Body() dto: AcceptTestDataDto) {
    return this.aiService.acceptTestData(id, dto);
  }

  @Post('suggestions/:id/apply-severity')
  @RequirePermission('ai:use')
  applySeverity(@Param('id') id: string, @Body() dto: ApplySeverityDto) {
    return this.aiService.applySeverity(id, dto);
  }

  @Patch('suggestions/:id')
  @RequirePermission('ai:use')
  updateSuggestionStatus(@Param('id') id: string, @Body() dto: UpdateSuggestionStatusDto) {
    return this.aiService.updateSuggestionStatus(id, dto);
  }

  @Get('suggestions')
  @RequirePermission('ai:read')
  listSuggestions(@Query() query: ListSuggestionsQueryDto) {
    return this.aiService.listSuggestions(query);
  }

  @Get('suggestions/:id')
  @RequirePermission('ai:read')
  getSuggestion(@Param('id') id: string) {
    return this.aiService.getSuggestion(id);
  }

  @Delete('suggestions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('ai:manage')
  removeSuggestion(@Param('id') id: string) {
    return this.aiService.removeSuggestion(id);
  }
}
