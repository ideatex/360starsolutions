import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Response,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RegistrationService, SubmitRegistrationDto } from './registration.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';
import { RegistrationStatus } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, resolve } from 'path';
import * as fs from 'fs';
import type { Response as ExpressResponse } from 'express';

const PROOFS_STORAGE_DIR = resolve(process.cwd(), 'storage', 'proofs');

// Ensure secure storage directory exists
if (!fs.existsSync(PROOFS_STORAGE_DIR)) {
  fs.mkdirSync(PROOFS_STORAGE_DIR, { recursive: true });
}

@Controller('registrations')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  /**
   * Public endpoint: Upload payment proof receipt securely.
   * Enforces MIME type check (JPEG, PNG, WEBP, PDF) and max size limit (5MB).
   * Stored outside public web root to prevent unauthorized public downloads.
   */
  @Post('upload-proof')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, PROOFS_STORAGE_DIR);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `proof-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB maximum file size
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
        const ext = extname(file.originalname).toLowerCase();

        if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
          return cb(
            new BadRequestException('Invalid file format. Only JPEG, PNG, WEBP, and PDF receipts are permitted.'),
            false
          );
        }
        cb(null, true);
      },
    })
  )
  async uploadProof(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded or file rejected by validator.');
    }
    if (file.size === 0) {
      // Remove empty corrupted file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new BadRequestException('Uploaded file is empty.');
    }

    return {
      success: true,
      originalName: file.originalname,
      fileName: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileUrl: `/api/v1/registrations/proof/${file.filename}`,
    };
  }

  /**
   * Secure Payment Proof Streaming:
   * Requires ADMIN or SUPER_ADMIN authentication.
   * Protects against unauthenticated public access and directory traversal attacks.
   */
  @Get('proof/:filename')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getPaymentProof(
    @Param('filename') rawFilename: string,
    @Response() res: ExpressResponse
  ) {
    // Sanitize filename against directory traversal
    const safeFilename = rawFilename.replace(/[^a-zA-Z0-9_.-]/g, '');
    const filePath = join(PROOFS_STORAGE_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Payment proof file "${safeFilename}" was not found.`);
    }

    return res.sendFile(filePath);
  }

  /**
   * Public endpoint: Validate referrer code/ID in real time during signup
   */
  @Get('verify-referrer/:code')
  async verifyReferrer(@Param('code') code: string) {
    return this.registrationService.verifyReferrer(code);
  }

  /**
   * Public / Authenticated endpoint: Submit registration request
   */
  @Post()
  async submit(@Request() req: any, @Body() body: SubmitRegistrationDto) {
    const actorId = req.shareholder?.id || req.user?.id;
    return this.registrationService.submitRegistration(body, actorId);
  }

  /**
   * Admin endpoint: List registration review queue
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async list(
    @Query('status') status?: RegistrationStatus | string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20'
  ) {
    return this.registrationService.getRegistrations(status, search, Number(page), Number(limit));
  }

  /**
   * Admin endpoint: Get registration request details
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getDetails(@Param('id') id: string) {
    return this.registrationService.getRegistrationById(id);
  }

  /**
   * Admin endpoint: Authoritative approval of registration request
   */
  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { withholdingPercentage?: number } = {}
  ) {
    const adminId = req.shareholder?.id || req.user?.id;
    return this.registrationService.approveRegistration(id, adminId, body);
  }

  /**
   * Admin endpoint: Rejection of registration request
   */
  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async reject(@Request() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    const adminId = req.shareholder?.id || req.user?.id;
    return this.registrationService.rejectRegistration(id, adminId, body.reason);
  }
}
