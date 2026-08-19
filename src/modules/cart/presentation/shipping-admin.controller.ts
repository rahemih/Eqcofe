import { Body,Controller,Get,Headers,Param,Patch,Post } from '@nestjs/common';
import { Permissions,StaffOnly } from '../../../platform/auth/auth.decorators';
import { ShippingAdminService } from '../application/shipping-admin.service';
const etag=(v:string|undefined)=>{const n=Number(String(v??'').replace(/^W\//,'').replace(/"/g,''));return Number.isSafeInteger(n)?n:NaN;};
@Controller('admin/shipping-methods') @StaffOnly()
export class ShippingAdminController{constructor(private readonly svc:ShippingAdminService){}@Get()@Permissions('checkout.shipping.view') list(){return this.svc.list();}@Post()@Permissions('checkout.shipping.manage') create(@Body()b:any){return this.svc.create(b);}@Patch(':id')@Permissions('checkout.shipping.manage') update(@Param('id')id:string,@Headers('if-match')m:string,@Body()b:any){return this.svc.update(id,b,etag(m));}}
