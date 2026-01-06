import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  async createUserWithProvider(
    name: string,
    username: string,
    email: string,
    provider: 'GOOGLE' | 'LOCAL',
    avatarUrl?: string | null,
    hashedPassword?: string | null,
  ) {
    // Transaction -> Ensures a user is always created with a provider
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, username, email, avatarUrl: avatarUrl ?? null },
      });
      await tx.authMethod.create({
        data: {
          userId: user.id,
          provider: provider,
          providerEmailId: user.email,
          hashedPassword: hashedPassword ?? null,
        },
      });
      return user;
    });
  }
}
