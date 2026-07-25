import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { FounderCmsService } from '@server/founder-cms/founder-cms.service';
import { JwtAuthGuard } from '@server/auth/jwt-auth.guard';
import { RolesGuard, Roles } from '@server/auth/roles.guard';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FounderCmsController {
  constructor(private readonly cmsService: FounderCmsService) {}

  @Get('founder/articles')
  async getPublishedArticles(@Query('search') search?: string) {
    return this.cmsService.getPublishedArticles(search);
  }

  @Get('founder/articles/:slug')
  async getArticleBySlug(@Request() req: any, @Param('slug') slug: string) {
    const isAdmin = req.shareholder.role === 'ADMIN' || req.shareholder.role === 'SUPER_ADMIN';
    return this.cmsService.getArticleBySlug(slug, isAdmin);
  }

  @Get('admin/founder/articles')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getAdminArticles() {
    return this.cmsService.getAdminArticles();
  }

  @Post('admin/founder/articles')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async createArticle(@Request() req: any, @Body() body: any) {
    return this.cmsService.createArticle(body, req.shareholder.id);
  }

  @Put('admin/founder/articles/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateArticle(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.cmsService.updateArticle(id, body, req.shareholder.id);
  }

  @Delete('admin/founder/articles/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async archiveArticle(@Request() req: any, @Param('id') id: string) {
    return this.cmsService.archiveArticle(id, req.shareholder.id);
  }
}
