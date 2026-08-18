import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

// Shared across every report endpoint. Report-specific extras (status,
// severity, readiness...) are declared on the subclasses below rather than
// folded in here, since the set of valid values differs per report --- and
// each field actually reaching the controller must be declared on SOME
// class, because @Query() hands the validation pipe the *entire* raw query
// string, and the global ValidationPipe's forbidNonWhitelisted:true rejects
// any key that isn't a decorated property.
export class ReportFilterDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

// The specific set of allowed values for each of these is validated at the
// service layer (validateEnumParam) rather than duplicated here via @IsIn,
// so there is exactly one place that lists what's valid per report.
export class StatusFilterDto extends ReportFilterDto {
  @IsOptional()
  @IsString()
  status?: string;
}

export class StatusSeverityFilterDto extends ReportFilterDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  severity?: string;
}

export class TestCaseStatusFilterDto extends ReportFilterDto {
  @IsOptional()
  @IsString()
  lifecycleStatus?: string;

  @IsOptional()
  @IsString()
  resultStatus?: string;
}

export class ReleaseQualityFilterDto extends ReportFilterDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  readiness?: string;
}
