import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JoinCommunityDto } from './dto/join-community.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './jwt.strategy';
import { UsersService } from '../users/users.service';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Resident: link account to an estate (new JWT includes communityId). */
  @Post('join-community')
  @UseGuards(AuthGuard('jwt'))
  joinCommunity(@CurrentUser() jwt: JwtPayload, @Body() dto: JoinCommunityDto) {
    return this.authService.joinCommunity(jwt, dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@CurrentUser() jwt: JwtPayload) {
    const user = await this.usersService.findById(jwt.sub);
    return this.usersService.toPublic(user!);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  changePassword(@CurrentUser() jwt: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(jwt, dto);
  }
}
