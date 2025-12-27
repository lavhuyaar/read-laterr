import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';

// db queries related to auth
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async validateJwtUser(userId: string) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }
}
