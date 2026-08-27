import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProductsModule } from './products/products.module';
import { ProductDocumentsModule } from './product-documents/product-documents.module';
import { RequirementsModule } from './requirements/requirements.module';
import { TestPlansModule } from './test-plans/test-plans.module';
import { TestScenariosModule } from './test-scenarios/test-scenarios.module';
import { TestCasesModule } from './test-cases/test-cases.module';
import { TestDataModule } from './test-data/test-data.module';
import { EnvironmentsModule } from './environments/environments.module';
import { TestExecutionsModule } from './test-executions/test-executions.module';
import { DefectsModule } from './defects/defects.module';
import { AutomationModule } from './automation/automation.module';
import { ApiTestingModule } from './api-testing/api-testing.module';
import { PerformanceTestingModule } from './performance-testing/performance-testing.module';
import { SecurityTestingModule } from './security-testing/security-testing.module';
import { UatModule } from './uat/uat.module';
import { TraceabilityModule } from './traceability/traceability.module';
import { ReleaseQualityModule } from './release-quality/release-quality.module';
import { ReportsModule } from './reports/reports.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AppSettingsModule } from './app-settings/app-settings.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditLogModule,
    UsersModule,
    RolesModule,
    AppSettingsModule,
    OrganizationsModule,
    ProductsModule,
    ProductDocumentsModule,
    RequirementsModule,
    TestPlansModule,
    TestScenariosModule,
    TestCasesModule,
    TestDataModule,
    EnvironmentsModule,
    TestExecutionsModule,
    DefectsModule,
    AutomationModule,
    ApiTestingModule,
    PerformanceTestingModule,
    SecurityTestingModule,
    UatModule,
    TraceabilityModule,
    ReleaseQualityModule,
    ReportsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
