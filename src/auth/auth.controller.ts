import {
  Controller,
  Get,
  Req,
  Res,
  Post,
  Delete,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { GoogleOAuthGuard } from 'src/auth/google-oauth/google-oauth.guard';
import type { CustomRequest } from 'src/types/CustomRequest.type';
import { UsersService } from 'src/users/users.service';
import { LinkAccountGuard } from './link-account.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('google-sign-in')
  @UseGuards(GoogleOAuthGuard)
  googleAuth() {}

  @Get('google-redirect')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthRedirect(
    @Req() request: CustomRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!request.user) throw new UnauthorizedException();

    const googleProvider = await this.authService.getProvider(
      request.user.email,
      'GOOGLE',
    );

    // If user has either signed in using google before, or linked his local account with google account
    if (googleProvider) {
      const user = await this.userService.getUser(googleProvider.userId);
      if (!user) throw new UnauthorizedException();
      const token = this.jwtService.sign(user);

      //Http only cookie
      response.cookie('token', token, {
        sameSite: 'strict',
        secure: true,
        httpOnly: true,
        maxAge: 6 * 24 * 60 * 60 * 1000, // 6d
      });

      return {
        user,
        method: 'Google',
        success: 'User signed in successfully!',
      };
    }

    const localProvider = await this.authService.getProvider(
      request.user.email,
      'LOCAL',
    );

    // If there only exists a local account with this email id
    if (localProvider) {
      const linkToken = this.jwtService.sign({
        userId: localProvider.userId,
        email: localProvider.providerEmailId,
        purpose: 'GOOGLE_LINK_ACCOUNT',
      });

      response.cookie('link_token', linkToken, {
        sameSite: 'strict',
        secure: true,
        httpOnly: true,
        maxAge: 2 * 60 * 1000, // 2m
      });

      return {
        message: 'Try linking Google account with existing Local account',
      };
    }

    // If neither local nor google provider exists (User is new)
    const { name, email, avatarUrl } = request.user;
    const username = `${name}${Date.now()}`;
    const newUser = await this.userService.createUserWithProvider(
      name,
      username,
      email,
      avatarUrl,
      'GOOGLE',
      null,
    );

    if (!newUser) throw new UnauthorizedException();
    const token = this.jwtService.sign(newUser);

    //Http only cookie
    response.cookie('token', token, {
      sameSite: 'strict',
      secure: true,
      httpOnly: true,
      maxAge: 6 * 24 * 60 * 60 * 1000, // 6d
    });

    return {
      user: newUser,
      method: 'Google',
      success: 'User signed in successfully!',
    };
  }

  @Get('link-google')
  @UseGuards(LinkAccountGuard)
  async linkGoogle(
    @Req() request: CustomRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!request.user) throw new UnauthorizedException();

    const googleProvider = await this.authService.createGoogleProvider(
      request.user.id,
      request.user.email,
    );

    if (!googleProvider) throw new UnauthorizedException();

    response.clearCookie('link_token');

    const user = await this.userService.getUser(request.user.id);
    if (!user) throw new UnauthorizedException();
    const token = this.jwtService.sign(user);

    response.cookie('token', token, {
      sameSite: 'strict',
      secure: true,
      httpOnly: true,
      maxAge: 6 * 24 * 60 * 60 * 1000, // 6d
    });

    return {
      user,
      method: 'Google',
      success: 'User logged in successfully!',
    };
  }

  @Post('register')
  async registerLocal() {}

  @Post('login')
  async loginLocal() {}

  @Delete('logout')
  async logout() {}
}
