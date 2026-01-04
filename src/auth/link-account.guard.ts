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
export class LinkAccountGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: CustomRequest = context.switchToHttp().getRequest();
    const linkToken: string | undefined =
      this.extractLinkTokenFromCookie(request);

    if (!linkToken) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        userId: string;
        email: string;
        purpose: string;
      }>(linkToken);

      if (payload.purpose !== 'GOOGLE_LINK_ACCOUNT')
        throw new UnauthorizedException();

      const user = await this.authService.validateJwtUser(payload.userId);

      if (!user) {
        throw new UnauthorizedException();
      }
      request.user = undefined;
      request.user = {
        id: payload.userId,
        email: payload.email,
      };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private extractLinkTokenFromCookie(
    request: CustomRequest,
  ): string | undefined {
    const linkToken: unknown = request.cookies.link_token;
    if (typeof linkToken == 'string') return linkToken;
    else return undefined;
  }
}
