import { Injectable } from '@nestjs/common';
import { NotificationProviderPort,OutboundNotificationChannel } from '../application/ports/notification-provider.port';
@Injectable()
export class NotificationProviderRegistry{
 private readonly providers=new Map<OutboundNotificationChannel,NotificationProviderPort>();
 register(provider:NotificationProviderPort){this.providers.set(provider.channel,provider);}
 get(channel:OutboundNotificationChannel){return this.providers.get(channel)??null;}
}
