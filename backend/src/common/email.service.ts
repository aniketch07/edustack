import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import EmailJS from '@emailjs/nodejs';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  async sendWelcomeEmail(params: {
    toEmail: string;
    toName: string;
    instituteName: string;
    loginEmail: string;
    loginPassword: string;
  }) {
    const serviceId = this.configService.get<string>('EMAILJS_SERVICE_ID');
    const templateId = this.configService.get<string>('EMAILJS_TEMPLATE_ID');
    const publicKey = this.configService.get<string>('EMAILJS_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('EMAILJS_PRIVATE_KEY');

    if (!serviceId || !templateId || !publicKey) {
      this.logger.warn('EmailJS credentials missing — skipping email');
      return;
    }

    const frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/$/, '');

    try {
      await EmailJS.send(
        serviceId,
        templateId,
        {
          to_email: params.toEmail,
          to_name: params.toName,
          institute_name: params.instituteName,
          login_email: params.loginEmail,
          login_password: params.loginPassword,
          login_url: `${frontendUrl}/login`,
        },
        {
          publicKey: publicKey,
          privateKey: privateKey || '',
        },
      );
      this.logger.log(`Welcome email sent to ${params.toEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${params.toEmail}: ${error}`);
    }
  }
}
