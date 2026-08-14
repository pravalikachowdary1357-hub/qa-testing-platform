import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProductsModule } from './products/products.module';
import { RequirementsModule } from './requirements/requirements.module';
import { TestPlansModule } from './test-plans/test-plans.module';
import { TestScenariosModule } from './test-scenarios/test-scenarios.module';
import { TestCasesModule } from './test-cases/test-cases.module';
import { TestDataModule } from './test-data/test-data.module';
import { EnvironmentsModule } from './environments/environments.module';
import { TestExecutionsModule } from './test-executions/test-executions.module';

@Module({
  imports: [
    PrismaModule,
    OrganizationsModule,
    ProductsModule,
    RequirementsModule,
    TestPlansModule,
    TestScenariosModule,
    TestCasesModule,
    TestDataModule,
    EnvironmentsModule,
    TestExecutionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
