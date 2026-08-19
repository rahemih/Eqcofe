import { Body,Controller,Get,Headers,Param,Patch,Post,HttpCode,HttpStatus } from '@nestjs/common';
import { Permissions,RequireStepUp,StaffOnly } from '../../../platform/auth/auth.decorators';
import { TaxService } from '../application/tax.service';
const etag=(v:string|undefined)=>{const n=Number(String(v??'').replace(/^W\//,'').replace(/"/g,''));return Number.isSafeInteger(n)?n:NaN;};
@Controller('admin/tax/rules') @StaffOnly()
export class TaxController{constructor(private readonly svc:TaxService){}@Get()@Permissions('tax.view') list(){return this.svc.list();}@Post()@Permissions('tax.manage') create(@Body()b:any){return this.svc.create(b);}@Patch(':id')@Permissions('tax.manage') update(@Param('id')id:string,@Headers('if-match')m:string,@Body()b:any){return this.svc.update(id,b,etag(m));}@HttpCode(HttpStatus.OK) @Post(':id/activate')@Permissions('tax.manage')@RequireStepUp() activate(@Param('id')id:string,@Headers('if-match')m:string){return this.svc.activate(id,etag(m));}@HttpCode(HttpStatus.OK) @Post(':id/expire')@Permissions('tax.manage')@RequireStepUp() expire(@Param('id')id:string,@Headers('if-match')m:string){return this.svc.expire(id,etag(m));}}
