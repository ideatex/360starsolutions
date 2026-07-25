import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { AuditService } from '@server/engines/audit/audit.service';

@Injectable()
export class FounderCmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-'); // Replace multiple - with single -
  }

  async createArticle(data: any, adminId: string) {
    const baseSlug = this.slugify(data.title);
    // Ensure slug uniqueness
    let slug = baseSlug;
    let count = 1;
    while (await this.prisma.founderArticle.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    const isScheduled = data.scheduledFor && new Date(data.scheduledFor) > new Date();
    const status = isScheduled ? 'SCHEDULED' : (data.status || 'PUBLISHED');
    const publishedAt = status === 'PUBLISHED' ? new Date() : null;

    const article = await this.prisma.founderArticle.create({
      data: {
        title: data.title,
        slug,
        content: data.content,
        coverImage: data.coverImage,
        seoTitle: data.seoTitle || data.title,
        seoDesc: data.seoDesc || '',
        seoKeywords: data.seoKeywords || '',
        status,
        version: 1,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        publishedAt,
        createdBy: adminId,
      },
    });

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'CREATE_FOUNDER_ARTICLE',
      entityType: 'FounderArticle',
      entityId: article.id,
      newValue: JSON.stringify(article),
    });

    return article;
  }

  async getPublishedArticles(search?: string) {
    const now = new Date();
    const where: any = {
      status: 'PUBLISHED',
      OR: [
        { scheduledFor: null },
        { scheduledFor: { lte: now } },
      ],
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    return this.prisma.founderArticle.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
    });
  }

  async getAdminArticles() {
    return this.prisma.founderArticle.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getArticleBySlug(slug: string, isAdmin = false) {
    const article = await this.prisma.founderArticle.findUnique({
      where: { slug },
      include: {
        history: {
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Verify published status for normal shareholders
    if (!isAdmin && article.status !== 'PUBLISHED') {
      const now = new Date();
      const isAvailable = article.scheduledFor && new Date(article.scheduledFor) <= now;
      if (!isAvailable) {
        throw new BadRequestException('Article is not published yet');
      }
    }

    return article;
  }

  async updateArticle(id: string, updates: any, adminId: string) {
    const article = await this.prisma.founderArticle.findUnique({ where: { id } });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // 1. Create Article Version History snapshot
    await this.prisma.founderArticleHistory.create({
      data: {
        articleId: id,
        title: article.title,
        content: article.content,
        version: article.version,
        updatedBy: adminId,
      },
    });

    const isScheduled = updates.scheduledFor && new Date(updates.scheduledFor) > new Date();
    const defaultStatus = isScheduled ? 'SCHEDULED' : article.status;
    const nextStatus = updates.status !== undefined ? updates.status : defaultStatus;
    const publishedAt = nextStatus === 'PUBLISHED' && !article.publishedAt ? new Date() : article.publishedAt;

    // 2. Perform the update and increment version
    const updated = await this.prisma.founderArticle.update({
      where: { id },
      data: {
        title: updates.title !== undefined ? updates.title : article.title,
        content: updates.content !== undefined ? updates.content : article.content,
        coverImage: updates.coverImage !== undefined ? updates.coverImage : article.coverImage,
        seoTitle: updates.seoTitle !== undefined ? updates.seoTitle : article.seoTitle,
        seoDesc: updates.seoDesc !== undefined ? updates.seoDesc : article.seoDesc,
        seoKeywords: updates.seoKeywords !== undefined ? updates.seoKeywords : article.seoKeywords,
        status: nextStatus,
        version: article.version + 1,
        scheduledFor: updates.scheduledFor !== undefined ? (updates.scheduledFor ? new Date(updates.scheduledFor) : null) : article.scheduledFor,
        publishedAt,
      },
    });

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'UPDATE_FOUNDER_ARTICLE',
      entityType: 'FounderArticle',
      entityId: id,
      oldValue: JSON.stringify(article),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  async archiveArticle(id: string, adminId: string) {
    const article = await this.prisma.founderArticle.findUnique({ where: { id } });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const updated = await this.prisma.founderArticle.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await this.auditService.logAction({
      shareholderId: adminId,
      action: 'ARCHIVE_FOUNDER_ARTICLE',
      entityType: 'FounderArticle',
      entityId: id,
    });

    return updated;
  }
}
