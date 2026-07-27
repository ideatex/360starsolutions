import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';

@Injectable()
export class ReferralTreeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Adds a shareholder to the tree under a specific parent.
   * Ensures no cyclic references dynamically.
   */
  async assignParent(shareholderId: string, parentId: string) {
    if (shareholderId === parentId) {
      throw new BadRequestException('Self-referral is not allowed.');
    }

    const parent = await this.prisma.shareholder.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true }
    });

    if (!parent) {
      throw new BadRequestException('Parent not found.');
    }

    // Check for circular dependency dynamically
    let currentParentId = parent.parentId;
    while (currentParentId) {
      if (currentParentId === shareholderId) {
        throw new BadRequestException('Circular referral detected.');
      }
      const ancestor = await this.prisma.shareholder.findUnique({
        where: { id: currentParentId },
        select: { parentId: true }
      });
      currentParentId = ancestor?.parentId || null;
    }

    const updated = await this.prisma.shareholder.update({
      where: { id: shareholderId },
      data: {
        parentId
      }
    });

    // Sync with ReferralRelationship table to enforce single source of truth
    await this.prisma.referralRelationship.upsert({
      where: { childId: shareholderId },
      create: {
        parentId,
        childId: shareholderId,
        referralDate: new Date(),
        status: 'ACTIVE'
      },
      update: {
        parentId,
        status: 'ACTIVE'
      }
    });

    return updated;
  }

  /**
   * Retrieves the direct children of a shareholder.
   */
  async getChildren(shareholderId: string) {
    return this.prisma.shareholder.findMany({
      where: { parentId: shareholderId },
      select: {
        id: true,
        shareholderId: true,
        referralCode: true,
      }
    });
  }

  /**
   * Retrieves the full downline of a shareholder up to 7 levels dynamically.
   */
  async getFullDownline(shareholderId: string) {
    const searchId = (shareholderId || '').trim();
    let rootId = searchId;
    const rootUser = await this.prisma.shareholder.findFirst({
      where: {
        OR: [
          { id: searchId },
          { shareholderId: searchId },
          { shareholderId: searchId.toUpperCase() },
        ],
      },
      select: { id: true }
    });
    if (rootUser) {
      rootId = rootUser.id;
    }

    const downline: any[] = [];
    let currentLevelIds = [rootId];
    let currentDepth = 1;

    while (currentLevelIds.length > 0 && currentDepth <= 7) {
      const children = await this.prisma.shareholder.findMany({
        where: { parentId: { in: currentLevelIds } },
        orderBy: { createdAt: 'asc' }
      });
      
      if (children.length === 0) break;
      
      children.forEach(child => {
        (child as any).relativeDepth = currentDepth;
        downline.push(child);
      });

      currentLevelIds = children.map(c => c.id);
      currentDepth++;
    }

    return downline;
  }
}
