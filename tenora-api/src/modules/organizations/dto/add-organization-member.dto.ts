import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { OrganizationMemberRole } from '../enums/organization-member-role.enum';

export class AddOrganizationMemberDto {
  @IsUUID('4')
  userId: string;

  @IsOptional()
  @IsEnum(OrganizationMemberRole)
  role?: OrganizationMemberRole;
}
