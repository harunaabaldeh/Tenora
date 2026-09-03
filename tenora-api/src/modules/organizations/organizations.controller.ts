import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrganizationMemberDto } from './dto/update-organization-member.dto';
import { OrganizationsService } from './organizations.service';

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: User, @Query() query: QueryOrganizationsDto) {
    return this.organizationsService.list(user, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.organizationsService.findById(id, user);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, user, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.organizationsService.remove(id, user);
  }

  @Get(':id/members')
  listMembers(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.organizationsService.listMembers(id, user);
  }

  @Post(':id/members')
  addMember(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AddOrganizationMemberDto,
  ) {
    return this.organizationsService.addMember(id, user, dto);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('memberId', new ParseUUIDPipe({ version: '4' })) memberId: string,
    @Body() dto: UpdateOrganizationMemberDto,
  ) {
    return this.organizationsService.updateMember(id, memberId, user, dto);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('memberId', new ParseUUIDPipe({ version: '4' })) memberId: string,
  ) {
    return this.organizationsService.removeMember(id, memberId, user);
  }
}
