import { Controller, Get, Post, Put, Patch, Param, Body, Query, UseGuards, Request, HttpStatus, HttpCode, ForbiddenException, BadRequestException, Delete } from '@nestjs/common';
import { UsersService } from '@server/shareholders/shareholders.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Controller('shareholders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Request() req: any) {
    return this.usersService.getDashboardMetrics(req.shareholder.id);
  }

  @Get('me/profile')
  async getProfileDetails(@Request() req: any) {
    return this.usersService.getProfileDetails(req.shareholder.id);
  }


  @Get('me/referral-tree')
  async getReferralTree(@Request() req: any) {
    return this.usersService.getReferralTree(req.shareholder.id);
  }

  @Get('me/profits')
  async getMeProfits(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.usersService.getMeProfits(req.shareholder.id, Number(page), Number(limit));
  }

  @Get('me/commissions')
  async getMeCommissions(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.usersService.getMeCommissions(req.shareholder.id, Number(page), Number(limit));
  }

  @Get('me/payouts')
  async getMePayouts(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.usersService.getMePayouts(req.shareholder.id, Number(page), Number(limit));
  }

  @Post('me/change-password')
  async changeMyPassword(@Request() req: any, @Body() body: any) {
    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException('Both current and new passwords are required');
    }
    return this.usersService.changeMyPassword(req.shareholder.id, body.currentPassword, body.newPassword);
  }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getUsers(
    @Query('search') search?: string,
    @Query('role') role?: Role,
    @Query('status') status?: UserStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.usersService.getUsers(search, role, status, Number(page), Number(limit));
  }

  @Get('validate-referral/:code')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async validateReferral(@Param('code') code: string) {
    return this.usersService.validateReferral(code);
  }

  @Get('next-id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getNextId() {
    return this.usersService.generateNextShareholderId();
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createUser(@Request() req: any, @Body() body: any) {
    const passwordHash = await bcrypt.hash(body.password || 'TemporaryPassword123!', 10);
    return this.usersService.createUser({
      ...body,
      passwordHash,
    }, req.shareholder.id);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateUser(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.usersService.updateUser(id, body, req.shareholder.id);
  }

  @Patch(':id/disable')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async disableUser(@Request() req: any, @Param('id') id: string) {
    return this.usersService.setStatus(id, 'DISABLED', req.shareholder.id);
  }

  @Patch(':id/enable')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async enableUser(@Request() req: any, @Param('id') id: string) {
    // Find the shareholder status first. If shareholder is in AUTO_ARCHIVED, only SUPER_ADMIN can restore/enable them.
    const shareholder = await this.usersService.getUsers(undefined, undefined, undefined, 1, 1).then(res => {
      // Direct query to prisma is cleaner since getUsers returns a paginated list
      return this.usersService.checkCircularReference(id, id).then(() => {
        // Just load shareholder via prisma from service context
        // Let's implement it inside the controller using usersService prisma context
        return (this.usersService as any).prisma.shareholder.findUnique({ where: { id } });
      });
    });

    if (shareholder?.status === 'AUTO_ARCHIVED' && req.shareholder.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admin can restore archived shareholders');
    }

    const nextStatus = shareholder?.status === 'AUTO_ARCHIVED' ? 'RESTORED' : 'ACTIVE';
    return this.usersService.setStatus(id, nextStatus as any, req.shareholder.id);
  }

  @Post(':id/reset-password')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    if (!body.password) {
      throw new ForbiddenException('New password is required');
    }
    return this.usersService.resetPassword(id, body.password, req.shareholder.id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Request() req: any, @Param('id') id: string) {
    return this.usersService.setStatus(id, 'DELETED', req.shareholder.id);
  }

  @Patch(':id/block')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async blockUser(@Request() req: any, @Param('id') id: string) {
    return this.usersService.setStatus(id, 'BLOCKED', req.shareholder.id);
  }

  @Patch(':id/unblock')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async unblockUser(@Request() req: any, @Param('id') id: string) {
    return this.usersService.setStatus(id, 'ACTIVE', req.shareholder.id);
  }
}

