import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { SmsStatus } from '@prisma/client';

export interface SendSmsParams {
  recipient: string;
  message: string;
  template?: string;
  shareholderId?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private maskSensitiveMessage(msg: string): string {
    return msg.replace(/password is ([^\s.]+)/gi, 'password is ********');
  }

  /**
   * Abstracted SMS dispatch method.
   * Pluggable provider architecture: console/mock by default, extensible to SMS gateway.
   * Logs every attempt to SmsLog table with sensitive information masked.
   */
  async sendSms(params: SendSmsParams): Promise<{ success: boolean; logId: string; status: SmsStatus }> {
    const { recipient, message, template, shareholderId } = params;

    // Default provider: MOCK_GATEWAY / CONSOLE
    const provider = process.env.SMS_PROVIDER || 'MOCK_GATEWAY';
    const maskedMessage = this.maskSensitiveMessage(message);

    this.logger.log(`[SMS OUTBOUND] To: ${recipient} | Provider: ${provider} | Message: "${maskedMessage}"`);

    let status: SmsStatus = SmsStatus.SENT;
    let providerResponse = 'Delivered to console mock';

    // Simulated provider dispatch
    try {
      if (provider === 'CONSOLE' || provider === 'MOCK_GATEWAY') {
        // Mock successful delivery
        providerResponse = JSON.stringify({ status: 'DELIVERED', timestamp: new Date().toISOString() });
      } else {
        // Extensible hook for third-party SMS providers (Twilio, Gupshup, Fast2SMS, etc.)
        providerResponse = JSON.stringify({ status: 'QUEUED', provider });
      }
    } catch (err: any) {
      status = SmsStatus.FAILED;
      providerResponse = JSON.stringify({ error: err.message });
      this.logger.error(`Failed to dispatch SMS to ${recipient}: ${err.message}`);
    }

    let validShareholderUuid: string | null = null;
    if (shareholderId) {
      const sh = await this.prisma.shareholder.findFirst({
        where: {
          OR: [
            { id: shareholderId },
            { shareholderId: shareholderId },
          ],
        },
        select: { id: true },
      });
      if (sh) {
        validShareholderUuid = sh.id;
      }
    }

    // Persist immutable SMS log with credentials masked for security
    const log = await this.prisma.smsLog.create({
      data: {
        recipient,
        shareholderId: validShareholderUuid,
        template: template || 'CUSTOM',
        message: maskedMessage,
        provider,
        providerResponse,
        status,
      },
    });

    return {
      success: status === SmsStatus.SENT,
      logId: log.id,
      status,
    };
  }

  /**
   * Retries dispatch of a failed SMS message with retry count tracking
   */
  async retrySms(logId: string): Promise<{ success: boolean; log: any }> {
    const log = await this.prisma.smsLog.findUnique({ where: { id: logId } });
    if (!log) {
      throw new Error(`SMS log ${logId} not found`);
    }
    if (log.retryCount >= 5) {
      throw new Error(`Maximum retry limit of 5 reached for SMS log ${logId}`);
    }

    const provider = process.env.SMS_PROVIDER || 'MOCK_GATEWAY';
    let status: SmsStatus = SmsStatus.SENT;
    let providerResponse = 'Delivered on retry';

    try {
      if (provider === 'CONSOLE' || provider === 'MOCK_GATEWAY') {
        providerResponse = JSON.stringify({ status: 'DELIVERED', retry: log.retryCount + 1, timestamp: new Date().toISOString() });
      } else {
        providerResponse = JSON.stringify({ status: 'QUEUED', retry: log.retryCount + 1, provider });
      }
    } catch (err: any) {
      status = SmsStatus.FAILED;
      providerResponse = JSON.stringify({ error: err.message, retry: log.retryCount + 1 });
    }

    const updated = await this.prisma.smsLog.update({
      where: { id: logId },
      data: {
        status,
        retryCount: log.retryCount + 1,
        providerResponse,
      },
    });

    return {
      success: status === SmsStatus.SENT,
      log: updated,
    };
  }

  /**
   * Helper: Send user login credentials upon registration approval
   */
  async sendCredentialsSms(recipient: string, shareholderId: string, tempPassword: string, userUuid?: string) {
    const message = `Welcome to 360 Star Solutions! Your User ID is ${shareholderId} and password is ${tempPassword}. Please log in to complete your profile.`;
    return this.sendSms({
      recipient,
      message,
      template: 'WELCOME_CREDENTIALS',
      shareholderId: userUuid || shareholderId,
    });
  }

  /**
   * Helper: Send payment acknowledgment receipt SMS
   */
  async sendPaymentReceiptSms(recipient: string, shareholderId: string, amount: number, userUuid?: string) {
    const message = `Thank you! Your Contribution Fund of ₹${amount.toLocaleString('en-IN')} has been verified and activated for User ID ${shareholderId}.`;
    return this.sendSms({
      recipient,
      message,
      template: 'PAYMENT_RECEIPT',
      shareholderId: userUuid || shareholderId,
    });
  }

  /**
   * Fetch SMS logs with pagination and filters
   */
  async getLogs(page = 1, limit = 20, recipient?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (recipient) {
      where.recipient = { contains: recipient };
    }

    const [logs, total] = await Promise.all([
      this.prisma.smsLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.smsLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }
}
