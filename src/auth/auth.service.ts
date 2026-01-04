import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UsersService,
  ) {}

  async validateJwtUser(userId: string) {
    return this.userService.getUser(userId);
  }

  async getProvider(email: string, provider: 'GOOGLE' | 'LOCAL') {
    return this.prisma.authMethod.findFirst({
      where: {
        providerEmailId: email,
        provider,
      },
    });
  }

  async createGoogleProvider(userId: string, email: string) {
    return this.prisma.authMethod.create({
      data: {
        userId,
        provider: 'GOOGLE',
        providerEmailId: email,
      },
    });
  }
}
