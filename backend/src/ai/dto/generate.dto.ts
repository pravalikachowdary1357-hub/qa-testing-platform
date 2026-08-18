import { IsUUID } from 'class-validator';

export class GenerateScenariosDto {
  @IsUUID()
  requirementId: string;
}

export class GenerateTestCasesDto {
  @IsUUID()
  testScenarioId: string;
}

export class SuggestTestDataDto {
  @IsUUID()
  testCaseId: string;
}

export class AnalyzeExecutionDto {
  @IsUUID()
  testExecutionId: string;
}

export class DefectTargetDto {
  @IsUUID()
  defectId: string;
}

export class DuplicateDefectsDto {
  @IsUUID()
  productId: string;
}

export class AnalyzeCoverageDto {
  @IsUUID()
  productId: string;
}

export class ExplainReleaseRisksDto {
  @IsUUID()
  releaseId: string;
}
