import { Controller, Delete, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

// Auth related api functions
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/register/oauth/google')
  async registerGoogle() {}

  @Post('/register/local')
  async registerLocal() {}

  @Post('/login/oauth/google')
  async loginGoogle() {}

  @Post('/login/local')
  async loginLocal() {}

  @Delete('/logout')
  async logout() {}
}
