import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateOrganizationMemberDto } from './dto/update-organization-member.dto';
import { OrganizationMember } from './entities/organization-member.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationMemberRole } from './enums/organization-member-role.enum';

const MANAGER_ROLES: OrganizationMemberRole[] = [
  OrganizationMemberRole.Owner,
  OrganizationMemberRole.Admin,
];

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  async create(actor: User, dto: CreateOrganizationDto): Promise<Organization> {
    this.assertCanCreateOrganization(actor);

    return this.entityManager.transaction(async (em) => {
      const organization = em.create(Organization, {
        name: dto.name,
        slug: await this.allocateSlug(em, dto.name, dto.slug),
        type: dto.type,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        website: dto.website ?? null,
      });

      try {
        const saved = await em.save(organization);
        await em.save(
          em.create(OrganizationMember, {
            organizationId: saved.id,
            userId: actor.id,
            role: OrganizationMemberRole.Owner,
          }),
        );
        return saved;
      } catch (error) {
        this.rethrowWriteError(
          error,
          'An organization with this slug already exists',
        );
      }
    });
  }

  async findById(id: string, actor: User): Promise<Organization> {
    await this.requireMembership(id, actor.id);
    return this.requireOrganization(id);
  }

  async list(
    actor: User,
    query: QueryOrganizationsDto,
  ): Promise<{
    data: Organization[];
    meta: { page: number; limit: number; total: number };
  }> {
    const [memberships, total] = await this.entityManager.findAndCount(
      OrganizationMember,
      {
        where: {
          userId: actor.id,
          ...(query.type ? { organization: { type: query.type } } : {}),
        },
        relations: { organization: true },
        order: { createdAt: 'DESC' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      },
    );

    return {
      data: memberships.map((membership) => membership.organization),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  async update(
    id: string,
    actor: User,
    dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const membership = await this.requireMembership(id, actor.id);
    this.assertManager(membership);

    const organization = await this.requireOrganization(id);

    if (dto.name !== undefined) {
      organization.name = dto.name;
    }
    if (dto.type !== undefined) {
      organization.type = dto.type;
    }
    if (dto.email !== undefined) {
      organization.email = dto.email;
    }
    if (dto.phone !== undefined) {
      organization.phone = dto.phone;
    }
    if (dto.website !== undefined) {
      organization.website = dto.website;
    }
    if (dto.isActive !== undefined) {
      organization.isActive = dto.isActive;
    }

    try {
      return await this.entityManager.save(organization);
    } catch (error) {
      this.rethrowWriteError(
        error,
        'An organization with this slug already exists',
      );
    }
  }

  async remove(id: string, actor: User): Promise<void> {
    const membership = await this.requireMembership(id, actor.id);
    if (membership.role !== OrganizationMemberRole.Owner) {
      throw new ForbiddenException(
        'Only an owner can delete this organization',
      );
    }

    const organization = await this.requireOrganization(id);
    const members = await this.entityManager.find(OrganizationMember, {
      where: { organizationId: id },
    });

    await this.entityManager.transaction(async (em) => {
      await em.softRemove(members);
      await em.softRemove(organization);
    });
  }

  async listMembers(
    organizationId: string,
    actor: User,
  ): Promise<OrganizationMember[]> {
    await this.requireMembership(organizationId, actor.id);

    return this.entityManager.find(OrganizationMember, {
      where: { organizationId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  async addMember(
    organizationId: string,
    actor: User,
    dto: AddOrganizationMemberDto,
  ): Promise<OrganizationMember> {
    const actorMembership = await this.requireMembership(
      organizationId,
      actor.id,
    );
    this.assertManager(actorMembership);
    await this.requireOrganization(organizationId);

    const user = await this.entityManager.findOne(User, {
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} was not found`);
    }
    if (user.role === UserRole.Tenant) {
      throw new ForbiddenException('Tenants cannot be organization members');
    }

    const role = dto.role ?? OrganizationMemberRole.Member;
    const existing = await this.entityManager.findOne(OrganizationMember, {
      where: { organizationId, userId: user.id },
      withDeleted: true,
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        'This user is already a member of the organization',
      );
    }

    if (existing?.deletedAt) {
      existing.deletedAt = null;
      existing.role = role;
      existing.user = user;
      return this.entityManager.save(existing);
    }

    const membership = this.entityManager.create(OrganizationMember, {
      organizationId,
      userId: user.id,
      role,
    });

    try {
      const saved = await this.entityManager.save(membership);
      saved.user = user;
      return saved;
    } catch (error) {
      this.rethrowWriteError(
        error,
        'This user is already a member of the organization',
      );
    }
  }

  async updateMember(
    organizationId: string,
    memberId: string,
    actor: User,
    dto: UpdateOrganizationMemberDto,
  ): Promise<OrganizationMember> {
    const actorMembership = await this.requireMembership(
      organizationId,
      actor.id,
    );
    this.assertManager(actorMembership);

    const membership = await this.requireMemberRecord(organizationId, memberId);

    if (
      membership.role === OrganizationMemberRole.Owner &&
      dto.role !== OrganizationMemberRole.Owner
    ) {
      await this.assertNotLastOwner(organizationId);
    }

    membership.role = dto.role;
    return this.entityManager.save(membership);
  }

  async removeMember(
    organizationId: string,
    memberId: string,
    actor: User,
  ): Promise<void> {
    const actorMembership = await this.requireMembership(
      organizationId,
      actor.id,
    );
    this.assertManager(actorMembership);

    const membership = await this.requireMemberRecord(organizationId, memberId);

    if (membership.role === OrganizationMemberRole.Owner) {
      await this.assertNotLastOwner(organizationId);
    }

    await this.entityManager.softRemove(membership);
  }

  private assertCanCreateOrganization(actor: User): void {
    if (actor.role === UserRole.Tenant) {
      throw new ForbiddenException('Tenants cannot create organizations');
    }
  }

  private assertManager(membership: OrganizationMember): void {
    if (!MANAGER_ROLES.includes(membership.role)) {
      throw new ForbiddenException(
        'You do not have permission to manage this organization',
      );
    }
  }

  private async requireOrganization(id: string): Promise<Organization> {
    const organization = await this.entityManager.findOne(Organization, {
      where: { id },
    });
    if (!organization) {
      throw new NotFoundException(`Organization ${id} was not found`);
    }
    return organization;
  }

  private async requireMembership(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember> {
    const membership = await this.entityManager.findOne(OrganizationMember, {
      where: { organizationId, userId },
    });
    if (!membership) {
      throw new NotFoundException(
        `Organization ${organizationId} was not found`,
      );
    }
    return membership;
  }

  private async requireMemberRecord(
    organizationId: string,
    memberId: string,
  ): Promise<OrganizationMember> {
    const membership = await this.entityManager.findOne(OrganizationMember, {
      where: { id: memberId, organizationId },
      relations: { user: true },
    });
    if (!membership) {
      throw new NotFoundException(`Member ${memberId} was not found`);
    }
    return membership;
  }

  private async assertNotLastOwner(organizationId: string): Promise<void> {
    const owners = await this.entityManager.count(OrganizationMember, {
      where: {
        organizationId,
        role: OrganizationMemberRole.Owner,
      },
    });
    if (owners <= 1) {
      throw new ConflictException(
        'Cannot remove the last owner of an organization',
      );
    }
  }

  private async allocateSlug(
    em: EntityManager,
    name: string,
    requested?: string,
  ): Promise<string> {
    const base = requested ?? slugify(name);
    let slug = base;
    let suffix = 2;

    while (await em.findOne(Organization, { where: { slug } })) {
      slug = `${base.slice(0, 72)}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private rethrowWriteError(error: unknown, message: string): never {
    if (
      error instanceof QueryFailedError &&
      isDriverError(error.driverError) &&
      error.driverError.code === '23505'
    ) {
      throw new ConflictException(message);
    }
    throw error;
  }
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);

  return slug.length >= 2 ? slug : 'org';
}

function isDriverError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}
