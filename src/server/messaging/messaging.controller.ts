import { Controller, Get, Post, Put, Patch, Param, Body, Query, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MessagingService } from '@server/messaging/messaging.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import * as fs from 'fs';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post()
  async createMessage(@Request() req: any, @Body() body: any) {
    return this.messagingService.sendMessage(req.shareholder.id, body);
  }

  @Get('inbox')
  async getInbox(@Request() req: any, @Query('search') search?: string, @Query('folder') folder?: string) {
    return this.messagingService.getInbox(req.shareholder.id, search, folder);
  }

  @Get('sent')
  async getSent(@Request() req: any, @Query('search') search?: string) {
    return this.messagingService.getSent(req.shareholder.id, search);
  }

  @Get('drafts')
  async getDrafts(@Request() req: any) {
    return this.messagingService.getDrafts(req.shareholder.id);
  }

  @Get(':id')
  async getMessageDetails(@Request() req: any, @Param('id') id: string) {
    return this.messagingService.getMessageDetails(id, req.shareholder.id);
  }

  @Patch(':id/flags')
  async updateFlags(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.messagingService.updateFlags(id, req.shareholder.id, body);
  }

  @Put('draft/:id')
  async updateDraft(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.messagingService.updateDraft(id, req.shareholder.id, body);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req: any, file: any, cb: any) => {
        const uploadDir = './public/uploads';
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return {
      fileName: file.originalname,
      fileUrl: `/public/uploads/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }
}
