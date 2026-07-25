import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { AnnouncementsService } from '@server/announcements/announcements.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get('announcements')
  async getMyAnnouncements(@Request() req: any) {
    return this.announcementsService.getAnnouncementsForUser(req.shareholder.id, req.shareholder.role);
  }

  @Post('announcements/:id/read')
  async markRead(@Request() req: any, @Param('id') id: string) {
    return this.announcementsService.markAsRead(id, req.shareholder.id);
  }

  @Get('admin/announcements')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getAdminAnnouncements() {
    return this.announcementsService.getAdminAnnouncements();
  }

  @Post('admin/announcements')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createAnnouncement(@Request() req: any, @Body() body: any) {
    return this.announcementsService.createAnnouncement(body, req.shareholder.id);
  }

  @Put('admin/announcements/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateAnnouncement(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.announcementsService.updateAnnouncement(id, body, req.shareholder.id);
  }

  @Delete('admin/announcements/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteAnnouncement(@Request() req: any, @Param('id') id: string) {
    return this.announcementsService.deleteAnnouncement(id, req.shareholder.id);
  }
}
