import {
  Controller,
  Get,
  Req,
  Res,
  Post,
  Delete,
  UseGuards,
  UnauthorizedException,
  HttpStatus,
  Body,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { GoogleOAuthGuard } from 'src/auth/google-oauth/google-oauth.guard';
import type { CustomRequest } from 'src/types/CustomRequest.type';
import { UsersService } from 'src/users/users.service';
import { LinkAccountGuard } from './link-account.guard';
import { RegisterDto } from 'src/validations/RegisterDto';
import { generateUsername } from 'src/utils/generateUsername';
import { JwtAuthGuard } from './jwt.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('google-sign-in')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
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
      const token = this.jwtService.sign({
        id: user.id,
        name: user.name,
        email: user.email,
      });

      //Http only cookie
      response.cookie('token', token, {
        sameSite: 'lax', // Change to strict just before deploying
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
        sameSite: 'lax', // Change to strict just before deploying
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
    const username = generateUsername(name);
    const newUser = await this.userService.createUserWithProvider(
      name,
      username,
      email,
      'GOOGLE',
      avatarUrl,
      null,
    );

    if (!newUser) throw new UnauthorizedException();
    const token = this.jwtService.sign({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    });

    //Http only cookie
    response.cookie('token', token, {
      sameSite: 'lax', // Change to strict just before deploying
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
  @Throttle({ default: { ttl: 60000, limit: 5 } })
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
    const token = this.jwtService.sign({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    response.cookie('token', token, {
      sameSite: 'lax', // Change to strict just before deploying
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
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  async registerLocal(@Body() body: RegisterDto) {
    const { name, password, email } = body;

    const existingUser = await this.userService.verifyUniqueUser(email);
    if (existingUser)
      throw new UnauthorizedException('Invalid email or password');

    const hashedPassword = await bcrypt.hash(password, 10);
    const username = generateUsername(name);
    const newUser = await this.userService.createUserWithProvider(
      name,
      username,
      email,
      'LOCAL',
      null,
      hashedPassword,
    );

    return {
      user: newUser,
      message: 'User registered successfully!',
    };
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async loginLocal(@Body() body: RegisterDto, @Res() response: Response) {
    const { email, password } = body;

    const localProvider = await this.authService.getProvider(email, 'LOCAL');

    // If user never existed or only Google auth method exists
    if (!localProvider)
      throw new UnauthorizedException('Invalid email or password');

    // If account was created via local method
    const hashedPassword: string | null = localProvider.hashedPassword;
    if (typeof hashedPassword != 'string') throw new UnauthorizedException();
    const isMatch = await bcrypt.compare(password, hashedPassword);

    if (!isMatch) throw new UnauthorizedException('Invalid email or password');

    const user = await this.userService.getUser(localProvider.userId);
    if (!user) throw new UnauthorizedException();

    const token = this.jwtService.sign({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    response.cookie('token', token, {
      sameSite: 'lax', // Change to strict just before deploying
      secure: true,
      httpOnly: true,
      maxAge: 6 * 24 * 60 * 60 * 1000,
    });

    return {
      user,
      message: 'User logged in successfully!',
    };
  }

  @Delete('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @Req() request: CustomRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!request.user) throw new UnauthorizedException();

    response.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax', // Change to strict just before deploying
    });
    return {
      message: 'Successfully logged out!',
    };
  }
}
