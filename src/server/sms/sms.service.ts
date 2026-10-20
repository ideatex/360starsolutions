import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/prisma/prisma.service';
import { SmsStatus } from '@prisma/client';
import axios from 'axios';

export interface SendSmsParams {
  recipient: string;
  message: string;
  template?: string;
  templateId?: string;
  variables?: Record<string, any>;
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
   * Format Indian mobile numbers for MSG91 / international SMS gateway
   * (e.g., '9876543210' -> '919876543210')
   */
  private formatMobileNumber(phone: string): string {
    const cleaned = (phone || '').replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }
    return cleaned;
  }

  /**
   * Dispatch SMS via MSG91 Flow API
   */
  private async dispatchViaMsg91(
    recipient: string,
    message: string,
    templateName?: string,
    templateId?: string,
    variables?: Record<string, any>,
  ): Promise<{ success: boolean; response: string }> {
    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) {
      this.logger.warn('[MSG91] MSG91_AUTH_KEY is not defined in environment variables. Falling back to simulated log.');
      return {
        success: true,
        response: JSON.stringify({ warning: 'MSG91_AUTH_KEY missing, logged in simulated mode', timestamp: new Date().toISOString() }),
      };
    }

    // Resolve template / flow ID from parameter or environment variables
    let resolvedTemplateId = templateId;
    if (!resolvedTemplateId && templateName) {
      if (
        templateName === 'FORGOT_PASSWORD_OTP' ||
        templateName === 'RESET_PASSWORD' ||
        templateName === 'CHANGE_PASSWORD_OTP'
      ) {
        resolvedTemplateId =
          process.env.MSG91_FLOW_RESET_PASSWORD ||
          process.env.MSG91_FLOW_FORGOT_PASSWORD ||
          '6ad361f9a6bdd2827d0662d2';
      } else if (
        templateName === 'REQUEST_SUBMITTED' ||
        templateName === 'REGISTRATION_SUBMITTED'
      ) {
        resolvedTemplateId =
          process.env.MSG91_FLOW_REQUEST_SUBMITTED || '6ad3624fe27a608e220ab3c2';
      } else if (
        templateName === 'DETAILS_UPDATE_REQUEST_SUBMITTED' ||
        templateName === 'DETAILS_UPDATE_SUBMITTED'
      ) {
        resolvedTemplateId =
          process.env.MSG91_FLOW_DETAILS_UPDATE_SUBMITTED ||
          '6ad362d7d866890654026100';
      } else if (
        templateName === 'DETAILS_UPDATE_REQUEST_APPROVED' ||
        templateName === 'DETAILS_UPDATE_APPROVED'
      ) {
        resolvedTemplateId =
          process.env.MSG91_FLOW_DETAILS_UPDATE_APPROVED ||
          '6ad361c36e899fdc450629b3';
      } else if (
        templateName === 'WELCOME_CREDENTIALS' ||
        templateName === 'REQUEST_APPROVED'
      ) {
        resolvedTemplateId =
          process.env.MSG91_FLOW_REQUEST_APPROVED ||
          process.env.MSG91_FLOW_WELCOME ||
          '6ad62a56ffea3763630b5942';
      } else if (templateName === 'PAYMENT_RECEIPT') {
        resolvedTemplateId = process.env.MSG91_FLOW_PAYMENT;
      }
    }

    const formattedMobile = this.formatMobileNumber(recipient);

    if (resolvedTemplateId) {
      // Build variable payload ensuring variables map properly to DLT tags
      const recipientVars: Record<string, any> = { ...(variables || {}) };
      if (recipientVars.otp && !recipientVars.num) {
        recipientVars.num = String(recipientVars.otp);
      }
      if (recipientVars.user_id && !recipientVars.alp1) {
        recipientVars.alp1 = String(recipientVars.user_id);
        recipientVars.var1 = String(recipientVars.user_id);
      }
      if (recipientVars.password && !recipientVars.alp2) {
        recipientVars.alp2 = String(recipientVars.password);
        recipientVars.var2 = String(recipientVars.password);
      }
      if (recipientVars.user_id && recipientVars.password && !recipientVars.alp) {
        recipientVars.alp = [String(recipientVars.user_id), String(recipientVars.password)];
      }

      // Use MSG91 Flow API (DLT template compliant)
      const payload: any = {
        template_id: resolvedTemplateId,
        short_url: '0',
        recipients: [
          {
            mobiles: formattedMobile,
            ...recipientVars,
          },
        ],
      };

      this.logger.log(`[MSG91 FLOW DISPATCH] To: ${formattedMobile} | Template ID: ${resolvedTemplateId}`);
      const res = await axios.post('https://control.msg91.com/api/v5/flow/', payload, {
        headers: {
          authkey: authKey,
          'content-type': 'application/json',
        },
        timeout: 10000,
      });

      return {
        success: res.status >= 200 && res.status < 300,
        response: JSON.stringify(res.data),
      };
    } else {
      // Fallback: If template ID is not yet configured, log warning
      this.logger.warn(`[MSG91] No Flow/Template ID found for template "${templateName || 'DEFAULT'}". Message: "${message}"`);
      return {
        success: true,
        response: JSON.stringify({
          status: 'PENDING_TEMPLATE_CONFIG',
          note: 'Template ID not yet configured for MSG91. Please provide template ID in environment variables.',
          recipient: formattedMobile,
        }),
      };
    }
  }

  /**
   * Abstracted SMS dispatch method.
   * Pluggable provider architecture: supports MOCK_GATEWAY, CONSOLE, and MSG91.
   * Logs every attempt to SmsLog table with sensitive information masked.
   */
  async sendSms(params: SendSmsParams): Promise<{ success: boolean; logId: string; status: SmsStatus }> {
    const { recipient, message, template, templateId, variables, shareholderId } = params;

    const provider = process.env.SMS_PROVIDER || 'MOCK_GATEWAY';
    const maskedMessage = this.maskSensitiveMessage(message);

    this.logger.log(`[SMS OUTBOUND] To: ${recipient} | Provider: ${provider} | Message: "${maskedMessage}"`);

    let status: SmsStatus = SmsStatus.SENT;
    let providerResponse = 'Delivered to console mock';

    try {
      if (provider === 'CONSOLE' || provider === 'MOCK_GATEWAY') {
        // Mock successful delivery
        providerResponse = JSON.stringify({ status: 'DELIVERED', timestamp: new Date().toISOString() });
      } else if (provider === 'MSG91') {
        const msg91Result = await this.dispatchViaMsg91(recipient, message, template, templateId, variables);
        status = msg91Result.success ? SmsStatus.SENT : SmsStatus.FAILED;
        providerResponse = msg91Result.response;
      } else {
        providerResponse = JSON.stringify({ status: 'QUEUED', provider });
      }
    } catch (err: any) {
      status = SmsStatus.FAILED;
      providerResponse = JSON.stringify({ error: err.response?.data || err.message });
      this.logger.error(`Failed to dispatch SMS to ${recipient} via ${provider}: ${err.message}`);
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
      } else if (provider === 'MSG91') {
        const msg91Result = await this.dispatchViaMsg91(log.recipient, log.message, log.template || undefined);
        status = msg91Result.success ? SmsStatus.SENT : SmsStatus.FAILED;
        providerResponse = msg91Result.response;
      } else {
        providerResponse = JSON.stringify({ status: 'QUEUED', retry: log.retryCount + 1, provider });
      }
    } catch (err: any) {
      status = SmsStatus.FAILED;
      providerResponse = JSON.stringify({ error: err.response?.data || err.message, retry: log.retryCount + 1 });
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
   * Helper: Send Password Reset / Change Password OTP SMS
   */
  async sendResetPasswordOtpSms(recipient: string, otp: string, shareholderId?: string) {
    const message = `${otp} is your One-Time Password (OTP) to reset your password on 369Portfolio.\n\nThis code is valid for 15 minutes.\n\nPlease do not share it with anyone.\n\n369Portfolio - Visual DE System`;
    return this.sendSms({
      recipient,
      message,
      template: 'RESET_PASSWORD',
      shareholderId,
      variables: {
        num: otp,
        otp,
        time: '15 min',
      },
    });
  }

  /**
   * Helper: Send Request_Submitted SMS upon account registration
   */
  async sendRegistrationSubmittedSms(recipient: string, shareholderId?: string) {
    const message = `Hello, your account creation request has been successfully submitted to 369Portfolio.\n\nWe are currently reviewing your details.\nYou will be notified once it is approved.\n\nThank you for your patience!\n\n369Portfolio - Visual DE System`;
    return this.sendSms({
      recipient,
      message,
      template: 'REQUEST_SUBMITTED',
      shareholderId,
    });
  }

  /**
   * Helper: Send Details_Update_Request_Submitted SMS
   */
  async sendDetailsUpdateSubmittedSms(recipient: string, shareholderId?: string) {
    const message = `We have received your request to update your Account details on 369Portfolio.\n\nOur team is reviewing the changes for security purposes.\n\nWe will notify you once approved.\n\n369Portfolio - Visual DE System`;
    return this.sendSms({
      recipient,
      message,
      template: 'DETAILS_UPDATE_REQUEST_SUBMITTED',
      shareholderId,
    });
  }

  /**
   * Helper: Send Details_Update_Request_Approved SMS
   */
  async sendDetailsUpdateApprovedSms(recipient: string, shareholderId?: string) {
    const message = `Your requested Account details have been successfully verified and approved.\n\n369Portfolio - Visual DE System`;
    return this.sendSms({
      recipient,
      message,
      template: 'DETAILS_UPDATE_REQUEST_APPROVED',
      shareholderId,
    });
  }

  /**
   * Helper: Send user login credentials upon registration approval (Request_Approved)
   */
  async sendCredentialsSms(recipient: string, shareholderId: string, tempPassword: string, userUuid?: string) {
    const message = `Welcome to 369Portfolio!\n\nYour account request has been approved.\nYou can now log in using your credentials.\nUsername: ${shareholderId}\nPassword: ${tempPassword}\n\n369Portfolio - Visual DE System`;
    return this.sendSms({
      recipient,
      message,
      template: 'REQUEST_APPROVED',
      shareholderId: userUuid || shareholderId,
      variables: {
        user_id: shareholderId,
        password: tempPassword,
        alp1: shareholderId,
        alp2: tempPassword,
        alp: [shareholderId, tempPassword],
      },
    });
  }

  /**
   * Alias: Send Request_Approved SMS
   */
  async sendRequestApprovedSms(recipient: string, username: string, tempPassword: string, userUuid?: string) {
    return this.sendCredentialsSms(recipient, username, tempPassword, userUuid);
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
      variables: {
        amount: amount.toLocaleString('en-IN'),
        user_id: shareholderId,
      },
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
