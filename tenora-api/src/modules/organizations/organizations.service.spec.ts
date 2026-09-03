import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { OrganizationMember } from './entities/organization-member.entity';
import { OrganizationMemberRole } from './enums/organization-member-role.enum';
import { OrganizationType } from './enums/organization-type.enum';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  const entityManager = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    softRemove: jest.fn(),
    transaction: jest.fn(),
  };

  const landlord = {
    id: '11111111-1111-4111-8111-111111111111',
    role: UserRole.Landlord,
  } as User;

  const tenant = {
    id: '22222222-2222-4222-8222-222222222222',
    role: UserRole.Tenant,
  } as User;

  const organizationId = '33333333-3333-4333-8333-333333333333';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: EntityManager, useValue: entityManager },
      ],
    }).compile();

    service = module.get(OrganizationsService);
    jest.clearAllMocks();
    entityManager.transaction.mockImplementation(
      async (work: (em: typeof entityManager) => Promise<unknown>) =>
        work(entityManager),
    );
  });

  it('creates an organization and makes the actor the owner', async () => {
    const createdOrg = { name: 'Acme Realty' };
    const savedOrg = {
      id: organizationId,
      name: 'Acme Realty',
      slug: 'acme-realty',
      type: OrganizationType.Independent,
    };
    entityManager.findOne.mockResolvedValue(null);
    entityManager.create
      .mockReturnValueOnce(createdOrg)
      .mockReturnValueOnce({ role: OrganizationMemberRole.Owner });
    entityManager.save
      .mockResolvedValueOnce(savedOrg)
      .mockResolvedValueOnce({});

    const organization = await service.create(landlord, {
      name: 'Acme Realty',
      type: OrganizationType.Independent,
    });

    expect(organization.slug).toBe('acme-realty');
    expect(entityManager.create).toHaveBeenNthCalledWith(
      2,
      OrganizationMember,
      expect.objectContaining({
        organizationId,
        userId: landlord.id,
        role: OrganizationMemberRole.Owner,
      }),
    );
  });

  it('rejects tenants from creating organizations', async () => {
    await expect(
      service.create(tenant, {
        name: 'Acme Realty',
        type: OrganizationType.Independent,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(entityManager.transaction).not.toHaveBeenCalled();
  });

  it('hides organizations the actor does not belong to', async () => {
    entityManager.findOne.mockResolvedValue(null);

    await expect(
      service.findById(organizationId, landlord),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to remove the last owner', async () => {
    entityManager.findOne
      .mockResolvedValueOnce({
        id: '44444444-4444-4444-8444-444444444444',
        organizationId,
        userId: landlord.id,
        role: OrganizationMemberRole.Owner,
      })
      .mockResolvedValueOnce({
        id: '55555555-5555-4555-8555-555555555555',
        organizationId,
        userId: landlord.id,
        role: OrganizationMemberRole.Owner,
      });
    entityManager.count.mockResolvedValue(1);

    await expect(
      service.removeMember(
        organizationId,
        '55555555-5555-4555-8555-555555555555',
        landlord,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(entityManager.softRemove).not.toHaveBeenCalled();
  });

  it('rejects adding a tenant as a member', async () => {
    entityManager.findOne
      .mockResolvedValueOnce({
        role: OrganizationMemberRole.Owner,
      })
      .mockResolvedValueOnce({ id: organizationId })
      .mockResolvedValueOnce({
        id: tenant.id,
        role: UserRole.Tenant,
      });

    await expect(
      service.addMember(organizationId, landlord, { userId: tenant.id }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
