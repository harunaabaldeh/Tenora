import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { AppConfig } from '../../config/configuration';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './types/jwt-payload';

const DUMMY_PASSWORD_HASH = bcrypt.hashSync('invalid-password', 12);

export type AuthResult = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: User;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<AuthResult> {
    const user = await this.usersService.create(createUserDto);
    return this.issueTokens(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithPassword(loginDto.email);
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordMatches = await bcrypt.compare(loginDto.password, passwordHash);

    if (!user || !user.isActive || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens(user);
  }

  private issueTokens(user: User): AuthResult {
    const expiresIn = this.configService.get('jwt.expiresIn', { infer: true });
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      expiresIn,
      user,
    };
  }
}
