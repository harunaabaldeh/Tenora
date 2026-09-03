import { IsEnum } from 'class-validator';
import { OrganizationMemberRole } from '../enums/organization-member-role.enum';

export class UpdateOrganizationMemberDto {
  @IsEnum(OrganizationMemberRole)
  role: OrganizationMemberRole;
}
