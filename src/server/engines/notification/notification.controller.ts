import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from '@server/engines/notification/notification.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';

@Controller('shareholders/me/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(@Request() req: any) {
    return this.notificationService.getUserNotifications(req.shareholder.id);
  }

  @Post('read-all')
  async markAllRead(@Request() req: any) {
    await this.notificationService.markAllAsRead(req.shareholder.id);
    return { success: true };
  }

  @Post(':id/read')
  async markRead(@Request() req: any, @Param('id') id: string) {
    await this.notificationService.markAsRead(req.shareholder.id, id);
    return { success: true };
  }

  @Post(':id/archive')
  async archiveNotification(@Request() req: any, @Param('id') id: string) {
    await this.notificationService.archiveNotification(req.shareholder.id, id);
    return { success: true };
  }

  @Delete(':id')
  async deleteNotification(@Request() req: any, @Param('id') id: string) {
    await this.notificationService.deleteNotification(req.shareholder.id, id);
    return { success: true };
  }
}
