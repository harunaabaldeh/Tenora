import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { OrganizationType } from '../enums/organization-type.enum';

export class QueryOrganizationsDto {
  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
