import { Body,Controller,Get,Headers,HttpCode,HttpStatus,Param,Patch,Post,Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomerOnly,Permissions,Public,RequireIdempotency,RequireStepUp,StaffOnly } from '../../../platform/auth/auth.decorators';
import { DomainError } from '../../../shared/errors/domain-error';
import { NotificationAdminService } from '../application/notification-admin.service';
import { NotificationTemplateService } from '../application/notification-template.service';
import { NotificationCommandService } from '../application/notification-command.service';
import { NotificationInAppService } from '../application/notification-in-app.service';
function uuid(value:string){const x=String(value??'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x))throw new DomainError('VALIDATION_ERROR','شناسه اعلان معتبر نیست.');return x;}
function bool(value:unknown){return value===true||value==='true'||value==='1';}
@Controller() export class NotificationsController{
 constructor(private readonly admin:NotificationAdminService,private readonly templates:NotificationTemplateService,private readonly commands:NotificationCommandService,private readonly inApp:NotificationInAppService,private readonly env:ConfigService){}
 @CustomerOnly() @Get('customer/notifications') customerInbox(@Query()q:any){return this.inApp.list({limit:q?.limit,offset:q?.offset,unreadOnly:bool(q?.unread_only)});}
 @CustomerOnly() @RequireIdempotency('notifications.customer.mark_read') @Patch('customer/notifications/:id/read') customerMarkRead(@Param('id')id:string){return this.inApp.markRead(uuid(id));}
 @CustomerOnly() @RequireIdempotency('notifications.customer.acknowledge') @HttpCode(HttpStatus.OK) @Post('customer/notifications/:id/acknowledge') customerAcknowledge(@Param('id')id:string){return this.inApp.acknowledge(uuid(id));}
 @StaffOnly() @Permissions('notifications.view') @Get('admin/notifications') list(@Query()q:any){return this.admin.list(q);}
 @StaffOnly() @Permissions('notifications.view') @Get('admin/notifications/operations/summary') operationsSummary(){return this.admin.operationsSummary();}
 @StaffOnly() @Permissions('notifications.view') @Get('admin/notifications/:id') get(@Param('id')id:string){return this.admin.get(id);}
 @StaffOnly() @Permissions('notifications.retry') @RequireStepUp() @RequireIdempotency('notifications.retry') @Post('admin/notifications/:id/retry') retry(@Param('id')id:string){return this.admin.retry(id);}
 @StaffOnly() @Permissions('notifications.templates.view') @Get('admin/notifications/templates') templatesList(@Query()q:any){return this.templates.list(q);}
 @StaffOnly() @Permissions('notifications.templates.manage') @RequireStepUp() @RequireIdempotency('notifications.template.create') @Post('admin/notifications/templates') templateCreate(@Body()b:any){return this.templates.create(b);}
 @StaffOnly() @Permissions('notifications.templates.manage') @RequireStepUp() @RequireIdempotency('notifications.template.revise') @Patch('admin/notifications/templates/:id') templateRevise(@Param('id')id:string,@Body()b:any){return this.templates.revise(id,b);}
 @StaffOnly() @Permissions('notifications.templates.view') @Post('admin/notifications/templates/:id/preview') templatePreview(@Param('id')id:string,@Body()b:any){return this.templates.preview(id,b);}
 @StaffOnly() @Permissions('notifications.templates.manage') @RequireStepUp() @RequireIdempotency('notifications.template.activate') @Post('admin/notifications/templates/:id/activate') templateActivate(@Param('id')id:string){return this.templates.activate(id);}
 @StaffOnly() @Permissions('notifications.templates.manage') @RequireStepUp() @RequireIdempotency('notifications.template.retire') @Post('admin/notifications/templates/:id/retire') templateRetire(@Param('id')id:string){return this.templates.retire(id);}
 @Public() @RequireIdempotency('notifications.internal.enqueue') @Post('internal/notifications') async internal(@Headers('authorization')auth:string,@Headers('idempotency-key')headerKey:string|undefined,@Body()b:any){const expected=this.env.get<string>('INTERNAL_SERVICE_BEARER','');if(!expected||auth!==`Bearer ${expected}`)throw new DomainError('INTERNAL_AUTH_REQUIRED','احراز هویت سرویس داخلی معتبر نیست.');const customer=String(b?.recipient_customer_id??'').trim(),staff=String(b?.recipient_staff_id??'').trim();if(Boolean(customer)===Boolean(staff))throw new DomainError('NOTIFICATION_RECIPIENT_INVALID','دقیقاً یک گیرنده مشتری یا کارمند الزامی است.');const scheduled=b?.scheduled_at?new Date(b.scheduled_at):null;if(scheduled&&!Number.isFinite(scheduled.getTime()))throw new DomainError('NOTIFICATION_SCHEDULE_INVALID','زمان‌بندی اعلان معتبر نیست.');const key=String(headerKey??b?.idempotency_key??'').trim();return this.commands.enqueueInternal({notification_kind:b?.notification_type,template_key:b?.template_key??b?.notification_type,source_type:'internal',source_id:`internal:${key}`,recipient_subject_type:customer?'customer':'staff',recipient_subject_id:customer||staff,channels:[b?.channel],variables:b?.payload??{},idempotency_key:key,scheduled_at:scheduled?.toISOString()??null});}
}
