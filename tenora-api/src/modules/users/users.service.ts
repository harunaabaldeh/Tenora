import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { EntityManager, QueryFailedError } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.entityManager.create(User, {
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS),
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      role: dto.role,
    });

    try {
      return await this.entityManager.save(user);
    } catch (error) {
      this.rethrowWriteError(error);
    }
  } 

  async findById(id: string): Promise<User> {
    const user = await this.entityManager.findOne(User, { where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} was not found`);
    }
    return user;
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.entityManager
      .createQueryBuilder(User, 'user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async list(query: QueryUsersDto): Promise<{
    data: User[];
    meta: { page: number; limit: number; total: number };
  }> {
    const [data, total] = await this.entityManager.findAndCount(User, {
      where: query.role ? { role: query.role } : {},
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.email !== undefined) {
      user.email = dto.email;
    }
    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName;
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone;
    }
    if (dto.role !== undefined) {
      user.role = dto.role;
    }
    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }
    if (dto.password !== undefined) {
      user.passwordHash = await bcrypt.hash(
        dto.password,
        PASSWORD_SALT_ROUNDS,
      );
    }

    try {
      return await this.entityManager.save(user);
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.entityManager.softRemove(user);
  }

  private rethrowWriteError(error: unknown): never {
    if (
      error instanceof QueryFailedError &&
      isDriverError(error.driverError) &&
      error.driverError.code === '23505'
    ) {
      throw new ConflictException('A user with this email already exists');
    }
    throw error;
  }
}

function isDriverError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}
