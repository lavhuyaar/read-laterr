import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { CustomRequest } from 'src/types/CustomRequest.type';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: CustomRequest = context.switchToHttp().getRequest();
    const token = this.extractTokenFromCookie(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        userId?: string;
      }>(token);

      if (!payload?.userId) {
        throw new UnauthorizedException();
      }

      const user = await this.authService.validateJwtUser(payload.userId);

      if (!user) {
        throw new UnauthorizedException();
      }

      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private extractTokenFromCookie(request: CustomRequest): string | undefined {
    const token: unknown = request.cookies.token;
    if (typeof token == 'string') return token;
    else return undefined;
  }
}
