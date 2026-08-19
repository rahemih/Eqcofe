import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpDeliveryPort } from '../application/identity.types';
@Injectable()
export class ConsoleOtpDelivery implements OtpDeliveryPort {
  private readonly logger=new Logger(ConsoleOtpDelivery.name);
  constructor(private readonly config:ConfigService){}
  async sendLoginCode(destination:string, code:string):Promise<void>{
    if(this.config.get<string>('NODE_ENV')==='production') throw new Error('OTP provider is not configured for production');
    this.logger.warn(`DEV OTP for ${destination.replace(/.(?=.{4})/g,'*')}: ${code}`);
  }
}
