import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from 'typeorm';
import { UserRole } from './enums/user-role.enum';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const entityManager = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    softRemove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: EntityManager, useValue: entityManager },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('hashes the password before saving', async () => {
    const created = { email: 'ada@example.com', passwordHash: 'hashed' };
    entityManager.create.mockReturnValue(created);
    entityManager.save.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      role: UserRole.Tenant,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    const user = await service.create({
      email: 'ada@example.com',
      password: 'plain-password',
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: UserRole.Tenant,
    });

    expect(user.email).toBe('ada@example.com');
    expect(entityManager.create).toHaveBeenCalledWith(
      User,
      expect.objectContaining({
        email: 'ada@example.com',
        passwordHash: expect.any(String),
        role: UserRole.Tenant,
      }),
    );
    expect(entityManager.create.mock.calls[0][1].passwordHash).not.toBe(
      'plain-password',
    );
    expect(entityManager.save).toHaveBeenCalledWith(created);
  });

  it('throws when the user does not exist', async () => {
    entityManager.findOne.mockResolvedValue(null);

    await expect(
      service.findById('11111111-1111-4111-8111-111111111111'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
