import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ReleaseQualityService } from '../release-quality/release-quality.service';
import { AiProviderService } from './ai-provider.service';
import { Prisma } from '../../generated/prisma/client.js';
import { AiCapability, AiSuggestionStatus } from '../../generated/prisma/enums.js';
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

function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

// Prisma throws a raw validation error (surfaced as an uncaught 500) for an
// enum-typed where-clause value that isn't one of the real enum members --
// query filters must be checked against the real values before reaching
// Prisma, exactly like the equivalent guard in the reports module.
function validateEnumParam<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  paramName: string,
): T | undefined {
  if (value === undefined) return undefined;
  if (!allowed.includes(value as T)) {
    throw new BadRequestException(`Invalid ${paramName} '${value}'. Expected one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

const AI_CAPABILITY_VALUES = [
  'GENERATE_TEST_SCENARIOS',
  'GENERATE_TEST_CASES',
  'SUGGEST_TEST_DATA',
  'ANALYZE_EXECUTION',
  'SUMMARIZE_DEFECT',
  'SUGGEST_DEFECT_SEVERITY',
  'DUPLICATE_DEFECTS',
  'ANALYZE_COVERAGE',
  'EXPLAIN_RELEASE_RISKS',
  'CHAT',
] as const;
const AI_SUGGESTION_STATUS_VALUES = ['PENDING', 'ACCEPTED', 'REJECTED', 'EDITED_AND_ACCEPTED'] as const;

// A deterministic, always-available (no external AI call) similarity score
// over word tokens -- used for duplicate-defect detection so that one
// capability keeps working even with no AI provider configured.
function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}
function textSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly releaseQualityService: ReleaseQualityService,
  ) {}

  getStatus() {
    const featuresEnabled = (process.env.AI_FEATURES_ENABLED ?? 'true').toLowerCase() !== 'false';
    return {
      configured: this.aiProvider.isConfigured(),
      featuresEnabled,
      model: this.aiProvider.getModelName(),
    };
  }

  // ==================== Generation capabilities ====================

  async generateScenarios(dto: GenerateScenariosDto) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id: dto.requirementId },
      include: { product: { select: { id: true, name: true } } },
    });
    if (!requirement) {
      throw new NotFoundException(`Requirement ${dto.requirementId} not found`);
    }

    const system =
      'You are a senior QA engineer helping design test scenarios for a software testing management ' +
      'platform. Given a single requirement, propose test scenarios that would verify it. Respond with ' +
      'ONLY a JSON object of the shape {"scenarios":[{"title":string,"description":string,' +
      '"type":"FUNCTIONAL"|"REGRESSION"|"INTEGRATION"|"SMOKE"|"EDGE_CASE",' +
      '"priority":"CRITICAL"|"HIGH"|"MEDIUM"|"LOW"}]}. Propose between 2 and 6 scenarios. No prose outside the JSON.';
    const prompt =
      `Requirement title: ${requirement.title}\n` +
      `Requirement type: ${requirement.type}\n` +
      `Requirement priority: ${requirement.priority}\n` +
      `Requirement description:\n${requirement.description}`;

    const raw = await this.aiProvider.complete({ system, prompt });
    const parsed = this.parseJsonResponse<{ scenarios?: unknown[] }>(raw, 'scenarios');

    const suggestion = await this.persistSuggestion({
      capability: AiCapability.GENERATE_TEST_SCENARIOS,
      sourceType: 'Requirement',
      sourceId: requirement.id,
      productId: requirement.productId,
      prompt,
      response: raw,
    });

    return {
      suggestionId: suggestion.id,
      scenarios: parsed.scenarios ?? [],
      rawResponse: raw,
      sourceContext: {
        type: 'Requirement',
        id: requirement.id,
        title: requirement.title,
        product: requirement.product,
      },
    };
  }

  async generateTestCases(dto: GenerateTestCasesDto) {
    const scenario = await this.prisma.testScenario.findUnique({
      where: { id: dto.testScenarioId },
      include: {
        product: { select: { id: true, name: true } },
        requirement: { select: { id: true, title: true } },
      },
    });
    if (!scenario) {
      throw new NotFoundException(`Test scenario ${dto.testScenarioId} not found`);
    }

    const system =
      'You are a senior QA engineer writing detailed test cases for a software testing management ' +
      'platform. Given a single test scenario, propose test cases with step-by-step actions. Respond ' +
      'with ONLY a JSON object of the shape {"testCases":[{"title":string,"description":string,' +
      '"preconditions":string|null,"expectedResult":string,"priority":"CRITICAL"|"HIGH"|"MEDIUM"|"LOW",' +
      '"steps":[{"action":string,"expectedResult":string}]}]}. Propose 1 to 4 test cases, each with 2 to 6 steps.';
    const prompt =
      `Test scenario title: ${scenario.title}\n` +
      `Type: ${scenario.type}\n` +
      `Priority: ${scenario.priority}\n` +
      `Description:\n${scenario.description}\n` +
      (scenario.requirement ? `Linked requirement: ${scenario.requirement.title}` : 'No linked requirement.');

    const raw = await this.aiProvider.complete({ system, prompt, maxTokens: 2048 });
    const parsed = this.parseJsonResponse<{ testCases?: unknown[] }>(raw, 'testCases');

    const suggestion = await this.persistSuggestion({
      capability: AiCapability.GENERATE_TEST_CASES,
      sourceType: 'TestScenario',
      sourceId: scenario.id,
      productId: scenario.productId,
      prompt,
      response: raw,
    });

    return {
      suggestionId: suggestion.id,
      testCases: parsed.testCases ?? [],
      rawResponse: raw,
      sourceContext: {
        type: 'TestScenario',
        id: scenario.id,
        title: scenario.title,
        product: scenario.product,
      },
    };
  }

  async suggestTestData(dto: SuggestTestDataDto) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id: dto.testCaseId },
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
        testScenario: { select: { productId: true, product: { select: { id: true, name: true } } } },
      },
    });
    if (!testCase) {
      throw new NotFoundException(`Test case ${dto.testCaseId} not found`);
    }

    const system =
      'You are a QA engineer preparing test data for a test case. Propose realistic, safe (non-real-PII) ' +
      'test data records useful for executing it. Respond with ONLY a JSON object of the shape ' +
      '{"testData":[{"name":string,"description":string|null,' +
      '"type":"INPUT"|"EXPECTED_OUTPUT"|"CREDENTIALS"|"CONFIGURATION"|"REFERENCE","value":string}]}. Propose 2 to 5 items.';
    const stepsText = testCase.steps.map((s) => `${s.stepNumber}. ${s.action} -> expect: ${s.expectedResult}`).join('\n');
    const prompt =
      `Test case title: ${testCase.title}\n` +
      `Description: ${testCase.description}\n` +
      `Preconditions: ${testCase.preconditions ?? 'none'}\n` +
      `Expected result: ${testCase.expectedResult}\n` +
      `Steps:\n${stepsText}`;

    const raw = await this.aiProvider.complete({ system, prompt });
    const parsed = this.parseJsonResponse<{ testData?: unknown[] }>(raw, 'testData');

    const suggestion = await this.persistSuggestion({
      capability: AiCapability.SUGGEST_TEST_DATA,
      sourceType: 'TestCase',
      sourceId: testCase.id,
      productId: testCase.testScenario.productId,
      prompt,
      response: raw,
    });

    return {
      suggestionId: suggestion.id,
      testData: parsed.testData ?? [],
      rawResponse: raw,
      sourceContext: {
        type: 'TestCase',
        id: testCase.id,
        title: testCase.title,
        product: testCase.testScenario.product,
      },
    };
  }

  async analyzeExecution(dto: AnalyzeExecutionDto) {
    const execution = await this.prisma.testExecution.findUnique({
      where: { id: dto.testExecutionId },
      include: {
        testCase: {
          include: {
            steps: { orderBy: { stepNumber: 'asc' } },
            testScenario: { select: { productId: true, product: { select: { id: true, name: true } } } },
          },
        },
        environment: { select: { id: true, name: true } },
      },
    });
    if (!execution) {
      throw new NotFoundException(`Test execution ${dto.testExecutionId} not found`);
    }

    const system =
      'You are a QA engineer analyzing a test execution result to suggest a likely root cause and next ' +
      'steps for a human to review -- you are not certain of the actual cause, only suggesting hypotheses ' +
      'grounded in the data given. Respond with ONLY a JSON object of the shape {"analysis":string,' +
      '"likelyRootCause":string,"suggestedNextSteps":string[]}.';
    const stepsText = execution.testCase.steps
      .map((s) => `${s.stepNumber}. ${s.action} -> expect: ${s.expectedResult}`)
      .join('\n');
    const prompt =
      `Test case: ${execution.testCase.title}\n` +
      `Steps:\n${stepsText}\n` +
      `Expected result: ${execution.testCase.expectedResult}\n` +
      `Execution status: ${execution.status}\n` +
      `Environment: ${execution.environment.name}\n` +
      `Actual result recorded: ${execution.actualResult ?? 'none recorded'}\n` +
      `Notes: ${execution.notes ?? 'none'}`;

    const raw = await this.aiProvider.complete({ system, prompt });
    const parsed = this.parseJsonResponse<{ analysis?: string; likelyRootCause?: string; suggestedNextSteps?: string[] }>(
      raw,
      'analysis',
    );

    const suggestion = await this.persistSuggestion({
      capability: AiCapability.ANALYZE_EXECUTION,
      sourceType: 'TestExecution',
      sourceId: execution.id,
      productId: execution.testCase.testScenario.productId,
      prompt,
      response: raw,
    });

    return {
      suggestionId: suggestion.id,
      analysis: parsed.analysis ?? raw,
      likelyRootCause: parsed.likelyRootCause ?? '',
      suggestedNextSteps: parsed.suggestedNextSteps ?? [],
      rawResponse: raw,
      sourceContext: {
        type: 'TestExecution',
        id: execution.id,
        title: `${execution.testCase.title} — ${execution.status}`,
        product: execution.testCase.testScenario.product,
      },
    };
  }

  async summarizeDefect(dto: DefectTargetDto) {
    const defect = await this.getDefectOr404(dto.defectId);

    const system =
      'Summarize this software defect for a stand-up update in 2 to 4 concise sentences, grounded only in ' +
      'the fields given. Respond with ONLY a JSON object of the shape {"summary":string}.';
    const prompt = this.defectPromptBody(defect);

    const raw = await this.aiProvider.complete({ system, prompt });
    const parsed = this.parseJsonResponse<{ summary?: string }>(raw, 'summary');

    const suggestion = await this.persistSuggestion({
      capability: AiCapability.SUMMARIZE_DEFECT,
      sourceType: 'Defect',
      sourceId: defect.id,
      productId: defect.productId,
      prompt,
      response: raw,
    });

    return {
      suggestionId: suggestion.id,
      summary: parsed.summary ?? raw,
      rawResponse: raw,
      sourceContext: { type: 'Defect', id: defect.id, title: defect.title, product: defect.product },
    };
  }

  async suggestDefectSeverity(dto: DefectTargetDto) {
    const defect = await this.getDefectOr404(dto.defectId);

    const system =
      'You are a QA lead triaging a defect. Suggest a severity (CRITICAL, MAJOR, MINOR, or TRIVIAL) and a ' +
      'priority (CRITICAL, HIGH, MEDIUM, or LOW), with brief reasoning grounded only in the fields given. ' +
      'Respond with ONLY a JSON object of the shape {"severity":string,"priority":string,"reasoning":string}.';
    const prompt = this.defectPromptBody(defect) + `\nCurrently recorded severity: ${defect.severity}\nCurrently recorded priority: ${defect.priority}`;

    const raw = await this.aiProvider.complete({ system, prompt });
    const parsed = this.parseJsonResponse<{ severity?: string; priority?: string; reasoning?: string }>(raw, 'severity');

    const suggestion = await this.persistSuggestion({
      capability: AiCapability.SUGGEST_DEFECT_SEVERITY,
      sourceType: 'Defect',
      sourceId: defect.id,
      productId: defect.productId,
      prompt,
      response: raw,
    });

    return {
      suggestionId: suggestion.id,
      currentSeverity: defect.severity,
      currentPriority: defect.priority,
      suggestedSeverity: parsed.severity ?? null,
      suggestedPriority: parsed.priority ?? null,
      reasoning: parsed.reasoning ?? '',
      rawResponse: raw,
      sourceContext: { type: 'Defect', id: defect.id, title: defect.title, product: defect.product },
    };
  }

  // Deterministic heuristic -- no external AI call, so it works even with
  // no provider configured. Uses Jaccard similarity over title+description
  // word tokens; flagged pairs are candidates for a human to confirm, never
  // auto-merged or auto-closed.
  async findDuplicateDefects(dto: DuplicateDefectsDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId }, select: { id: true, name: true } });
    if (!product) {
      throw new BadRequestException(`Product ${dto.productId} not found`);
    }

    const defects = await this.prisma.defect.findMany({
      where: { productId: dto.productId },
      select: { id: true, title: true, description: true, severity: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    const SIMILARITY_THRESHOLD = 0.4;
    const pairs: Array<{
      defectAId: string;
      defectATitle: string;
      defectBId: string;
      defectBTitle: string;
      similarityPercent: number;
    }> = [];
    for (let i = 0; i < defects.length; i++) {
      for (let j = i + 1; j < defects.length; j++) {
        const similarity = textSimilarity(
          `${defects[i].title} ${defects[i].description}`,
          `${defects[j].title} ${defects[j].description}`,
        );
        if (similarity >= SIMILARITY_THRESHOLD) {
          pairs.push({
            defectAId: defects[i].id,
            defectATitle: defects[i].title,
            defectBId: defects[j].id,
            defectBTitle: defects[j].title,
            similarityPercent: Math.round(similarity * 100),
          });
        }
      }
    }
    pairs.sort((a, b) => b.similarityPercent - a.similarityPercent);

    const suggestion = await this.persistSuggestion({
      capability: AiCapability.DUPLICATE_DEFECTS,
      sourceType: 'Product',
      sourceId: product.id,
      productId: product.id,
      prompt: `Heuristic duplicate-defect scan over ${defects.length} defect(s) for product "${product.name}" (token-overlap similarity, no external AI call).`,
      response: JSON.stringify({ pairs }),
    });

    return {
      suggestionId: suggestion.id,
      method: 'heuristic-text-similarity' as const,
      totalDefectsScanned: defects.length,
      pairs: pairs.slice(0, 25),
      truncated: pairs.length > 25,
    };
  }

  async analyzeCoverage(dto: AnalyzeCoverageDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId }, select: { id: true, name: true } });
    if (!product) {
      throw new BadRequestException(`Product ${dto.productId} not found`);
    }

    const requirements = await this.prisma.requirement.findMany({
      where: { productId: dto.productId },
      select: { id: true, title: true, testScenarios: { select: { id: true, testCases: { select: { id: true } } } } },
    });
    const testCaseIds = requirements.flatMap((r) => r.testScenarios.flatMap((s) => s.testCases.map((c) => c.id)));
    const executions = testCaseIds.length
      ? await this.prisma.testExecution.findMany({
          where: { testCaseId: { in: testCaseIds } },
          orderBy: { executedAt: 'desc' },
          select: { testCaseId: true, status: true },
        })
      : [];
    const latestByTestCase = new Map<string, string>();
    for (const execution of executions) {
      if (!latestByTestCase.has(execution.testCaseId)) latestByTestCase.set(execution.testCaseId, execution.status);
    }

    const totalRequirements = requirements.length;
    const coveredRequirements = requirements.filter((r) => r.testScenarios.length > 0).length;
    const uncoveredRequirementTitles = requirements.filter((r) => r.testScenarios.length === 0).map((r) => r.title);
    const totalTestCases = testCaseIds.length;
    let passCount = 0;
    let failCount = 0;
    let notRunCount = 0;
    for (const id of testCaseIds) {
      const status = latestByTestCase.get(id);
      if (status === 'PASS') passCount += 1;
      else if (status === 'FAIL') failCount += 1;
      else if (!status) notRunCount += 1;
    }
    const executedTestCases = totalTestCases - notRunCount;

    const coverageData = {
      totalRequirements,
      coveredRequirements,
      requirementCoveragePercent: percent(coveredRequirements, totalRequirements),
      uncoveredRequirementTitles: uncoveredRequirementTitles.slice(0, 10),
      totalTestCases,
      executedTestCases,
      testCoveragePercent: percent(executedTestCases, totalTestCases),
      passRatePercent: percent(passCount, executedTestCases),
      failCount,
    };

    const system =
      'You are a QA lead explaining test coverage risk to stakeholders in plain language. Use ONLY the ' +
      'numbers given below -- do not invent any additional statistics or claim data you were not given. ' +
      'Respond with ONLY a JSON object of the shape {"narrative":string,"topRisks":string[]}.';
    const prompt = `Real, computed coverage data for product "${product.name}":\n${JSON.stringify(coverageData, null, 2)}`;

    const raw = await this.aiProvider.complete({ system, prompt });
    const parsed = this.parseJsonResponse<{ narrative?: string; topRisks?: string[] }>(raw, 'narrative');

    const suggestion = await this.persistSuggestion({
      capability: AiCapability.ANALYZE_COVERAGE,
      sourceType: 'Product',
      sourceId: product.id,
      productId: product.id,
      prompt,
      response: raw,
    });

    return {
      suggestionId: suggestion.id,
      coverageData,
      narrative: parsed.narrative ?? '',
      topRisks: parsed.topRisks ?? [],
      rawResponse: raw,
      sourceContext: { type: 'Product', id: product.id, title: product.name },
    };
  }

  async explainReleaseRisks(dto: ExplainReleaseRisksDto) {
    const release = await this.releaseQualityService.findOne(dto.releaseId);

    const system =
      'You are a release manager explaining why a release is or is not ready, based ONLY on the real ' +
      'quality-gate results given below -- do not invent additional risks. Prioritize blocking issues ' +
      'first. Respond with ONLY a JSON object of the shape {"narrative":string,"prioritizedActions":string[]}.';
    const gatesText = release.quality.gates
      .map((gate) => `- [${gate.impact}] ${gate.label}: ${gate.passed ? 'PASS' : 'FAIL'} -- ${gate.detail}`)
      .join('\n');
    const prompt =
      `Release "${release.name}" (${release.version}) for product "${release.product.name}".\n` +
      `Computed readiness: ${release.quality.readiness}\n` +
      `Gates:\n${gatesText}`;

    const raw = await this.aiProvider.complete({ system, prompt });
    const parsed = this.parseJsonResponse<{ narrative?: string; prioritizedActions?: string[] }>(raw, 'narrative');

    const suggestion = await this.persistSuggestion({
      capability: AiCapability.EXPLAIN_RELEASE_RISKS,
      sourceType: 'Release',
      sourceId: release.id,
      productId: release.productId,
      prompt,
      response: raw,
    });

    return {
      suggestionId: suggestion.id,
      readiness: release.quality.readiness,
      gates: release.quality.gates,
      narrative: parsed.narrative ?? '',
      prioritizedActions: parsed.prioritizedActions ?? [],
      rawResponse: raw,
      sourceContext: {
        type: 'Release',
        id: release.id,
        title: `${release.name} (${release.version})`,
        product: release.product,
      },
    };
  }

  async chat(dto: ChatDto) {
    const system =
      "You are TestSphere's AI testing assistant. Help with QA/testing questions: test planning, test " +
      'design, defect triage, and release readiness concepts. You do not have live access to this ' +
      "organization's specific data beyond what the user tells you in this conversation -- do not claim " +
      'specific defect counts, coverage numbers, or release status unless the user provided them. Be concise.';
    const historyText = (dto.history ?? []).map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    const prompt = historyText ? `${historyText}\nUser: ${dto.message}` : dto.message;

    const raw = await this.aiProvider.complete({ system, prompt, maxTokens: 1024 });

    const suggestion = await this.persistSuggestion({
      capability: AiCapability.CHAT,
      sourceType: null,
      sourceId: null,
      productId: null,
      prompt,
      response: raw,
    });

    return { suggestionId: suggestion.id, reply: raw };
  }

  // ==================== Accept / apply (writes real entities) ====================

  async acceptScenarios(suggestionId: string, dto: AcceptScenariosDto) {
    const suggestion = await this.getSuggestionOr404(suggestionId);
    if (suggestion.capability !== AiCapability.GENERATE_TEST_SCENARIOS) {
      throw new BadRequestException('This suggestion is not a scenario-generation suggestion.');
    }
    if (!suggestion.productId) {
      throw new BadRequestException('This suggestion has no associated product.');
    }
    const requirementId = suggestion.sourceType === 'Requirement' ? suggestion.sourceId : undefined;

    const created = [];
    try {
      for (const item of dto.scenarios) {
        created.push(
          await this.prisma.testScenario.create({
            data: {
              productId: suggestion.productId,
              requirementId: requirementId ?? undefined,
              title: item.title,
              description: item.description,
              type: item.type,
              priority: item.priority,
            },
          }),
        );
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('The source product or requirement no longer exists.');
      }
      throw error;
    }

    await this.markAccepted(suggestionId, dto.edited);
    return { created };
  }

  async acceptTestCases(suggestionId: string, dto: AcceptTestCasesDto) {
    const suggestion = await this.getSuggestionOr404(suggestionId);
    if (suggestion.capability !== AiCapability.GENERATE_TEST_CASES) {
      throw new BadRequestException('This suggestion is not a test-case-generation suggestion.');
    }
    if (suggestion.sourceType !== 'TestScenario' || !suggestion.sourceId) {
      throw new BadRequestException('This suggestion has no associated test scenario.');
    }
    const testScenarioId = suggestion.sourceId;

    const created = [];
    try {
      for (const item of dto.testCases) {
        created.push(
          await this.prisma.testCase.create({
            data: {
              testScenarioId,
              title: item.title,
              description: item.description,
              preconditions: item.preconditions,
              expectedResult: item.expectedResult,
              priority: item.priority,
              steps: {
                create: item.steps.map((step, index) => ({
                  stepNumber: index + 1,
                  action: step.action,
                  expectedResult: step.expectedResult,
                })),
              },
            },
            include: { steps: { orderBy: { stepNumber: 'asc' } } },
          }),
        );
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Test scenario ${testScenarioId} no longer exists.`);
      }
      throw error;
    }

    await this.markAccepted(suggestionId, dto.edited);
    return { created };
  }

  async acceptTestData(suggestionId: string, dto: AcceptTestDataDto) {
    const suggestion = await this.getSuggestionOr404(suggestionId);
    if (suggestion.capability !== AiCapability.SUGGEST_TEST_DATA) {
      throw new BadRequestException('This suggestion is not a test-data suggestion.');
    }
    if (suggestion.sourceType !== 'TestCase' || !suggestion.sourceId) {
      throw new BadRequestException('This suggestion has no associated test case.');
    }
    const testCaseId = suggestion.sourceId;

    const created = [];
    try {
      for (const item of dto.testData) {
        created.push(
          await this.prisma.testData.create({
            data: {
              testCaseId,
              name: item.name,
              description: item.description,
              type: item.type,
              value: item.value,
            },
          }),
        );
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(`Test case ${testCaseId} no longer exists.`);
      }
      throw error;
    }

    await this.markAccepted(suggestionId, dto.edited);
    return { created };
  }

  async applySeverity(suggestionId: string, dto: ApplySeverityDto) {
    const suggestion = await this.getSuggestionOr404(suggestionId);
    if (suggestion.capability !== AiCapability.SUGGEST_DEFECT_SEVERITY) {
      throw new BadRequestException('This suggestion is not a defect-severity suggestion.');
    }
    if (suggestion.sourceType !== 'Defect' || !suggestion.sourceId) {
      throw new BadRequestException('This suggestion has no associated defect.');
    }
    if (!dto.severity && !dto.priority) {
      throw new BadRequestException('Provide at least a severity or a priority to apply.');
    }

    let updated;
    try {
      updated = await this.prisma.defect.update({
        where: { id: suggestion.sourceId },
        data: { severity: dto.severity, priority: dto.priority },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Defect ${suggestion.sourceId} not found`);
      }
      throw error;
    }

    await this.markAccepted(suggestionId, dto.edited);
    return { updated };
  }

  async updateSuggestionStatus(suggestionId: string, dto: UpdateSuggestionStatusDto) {
    await this.getSuggestionOr404(suggestionId);
    return this.prisma.aiSuggestion.update({ where: { id: suggestionId }, data: { status: dto.status } });
  }

  // ==================== History ====================

  async listSuggestions(query: ListSuggestionsQueryDto) {
    const capability = validateEnumParam(query.capability, AI_CAPABILITY_VALUES, 'capability');
    const status = validateEnumParam(query.status, AI_SUGGESTION_STATUS_VALUES, 'status');
    return this.prisma.aiSuggestion.findMany({
      where: {
        productId: query.productId,
        capability: capability as AiCapability | undefined,
        status: status as AiSuggestionStatus | undefined,
      },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getSuggestion(id: string) {
    return this.getSuggestionOr404(id);
  }

  async removeSuggestion(id: string) {
    await this.getSuggestionOr404(id);
    await this.prisma.aiSuggestion.delete({ where: { id } });
  }

  // ==================== private helpers ====================

  private async getDefectOr404(defectId: string) {
    const defect = await this.prisma.defect.findUnique({
      where: { id: defectId },
      include: { product: { select: { id: true, name: true } } },
    });
    if (!defect) {
      throw new NotFoundException(`Defect ${defectId} not found`);
    }
    return defect;
  }

  private defectPromptBody(defect: {
    title: string;
    description: string;
    stepsToReproduce: string;
    expectedResult: string;
    actualResult: string;
    severity: string;
    priority: string;
    status: string;
  }): string {
    return (
      `Title: ${defect.title}\n` +
      `Description: ${defect.description}\n` +
      `Steps to reproduce: ${defect.stepsToReproduce}\n` +
      `Expected result: ${defect.expectedResult}\n` +
      `Actual result: ${defect.actualResult}\n` +
      `Status: ${defect.status}`
    );
  }

  private async getSuggestionOr404(id: string) {
    const suggestion = await this.prisma.aiSuggestion.findUnique({ where: { id } });
    if (!suggestion) {
      throw new NotFoundException(`AI suggestion ${id} not found`);
    }
    return suggestion;
  }

  private async markAccepted(suggestionId: string, edited: boolean | undefined): Promise<void> {
    await this.prisma.aiSuggestion.update({
      where: { id: suggestionId },
      data: { status: edited ? 'EDITED_AND_ACCEPTED' : 'ACCEPTED' },
    });
  }

  private async persistSuggestion(data: {
    capability: AiCapability;
    sourceType: string | null;
    sourceId: string | null;
    productId: string | null;
    prompt: string;
    response: string;
  }) {
    return this.prisma.aiSuggestion.create({ data });
  }

  // Handles markdown code-fence wrapping and malformed JSON gracefully --
  // real LLM output isn't guaranteed to be perfectly structured, so a
  // parse failure degrades to an empty structured result (with the raw
  // text still returned separately to the caller) rather than throwing.
  private parseJsonResponse<T extends Record<string, unknown>>(raw: string, expectedKey: string): T {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '');
    try {
      const parsed = JSON.parse(cleaned) as T;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // fall through to the empty-result fallback below
    }
    return { [expectedKey]: [] } as unknown as T;
  }
}
