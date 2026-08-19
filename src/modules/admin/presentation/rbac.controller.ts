import { Body, Controller, Get, Headers, Param, Patch, Post, Put, Req, Res } from '@nestjs/common';
import { Permissions, RequireStepUp, StaffOnly } from '../../../platform/auth/auth.decorators';
import { RbacService } from '../application/rbac.service';
import { AppError } from '../../../shared/errors/app-error';
function version(h:string|undefined):number{const v=Number(String(h??'').replace(/^W\//,'').replace(/"/g,''));if(!Number.isInteger(v)||v<=0)throw new AppError('IF_MATCH_REQUIRED','If-Match معتبر الزامی است.',428);return v;}
function etag(res:any,value:any){if(value?.version)res.header('ETag',`"${value.version}"`);return value;}

@StaffOnly()
@Controller('admin')
export class RbacController {
  constructor(private readonly r:RbacService){}
  @Get('rbac/permissions') @Permissions('rbac.view') permissions(){return this.r.listPermissions();}
  @Get('rbac/roles') @Permissions('rbac.view') roles(){return this.r.listRoles();}
  @Post('rbac/roles') @Permissions('rbac.manage') @RequireStepUp() createRole(@Body() b:any){return this.r.createRole(b);}
  @Get('rbac/roles/:id') @Permissions('rbac.view') async role(@Param('id') id:string,@Res({passthrough:true})res:any){return etag(res,await this.r.getRole(id));}
  @Patch('rbac/roles/:id') @Permissions('rbac.manage') @RequireStepUp() async updateRole(@Param('id')id:string,@Body()b:any,@Headers('if-match')h:string|undefined,@Res({passthrough:true})res:any){return etag(res,await this.r.updateRole(id,b,version(h)));}
  @Put('rbac/roles/:id/permissions') @Permissions('rbac.manage') @RequireStepUp() setPermissions(@Param('id')id:string,@Body()b:{permission_ids:string[];reason?:string},@Headers('if-match')h:string|undefined){return this.r.setPermissions(id,b.permission_ids,version(h),b.reason);}
  @Get('staff') @Permissions('staff.view') staff(){return this.r.listStaff();}
  @Get('staff/:id') @Permissions('staff.view') async getStaff(@Param('id')id:string,@Res({passthrough:true})res:any){return etag(res,await this.r.getStaff(id));}
  @Patch('staff/:id') @Permissions('staff.manage') async updateStaff(@Param('id')id:string,@Body()b:any,@Headers('if-match')h:string|undefined,@Res({passthrough:true})res:any){return etag(res,await this.r.updateStaff(id,b,version(h)));}
  @Post('staff') @Permissions('staff.manage') @RequireStepUp() createStaff(@Body()b:any){return this.r.createStaff(b);}
  @Post('staff/:id/fido/reset-enrollment') @Permissions('security.fido.recover') @RequireStepUp() resetFido(@Param('id')id:string,@Headers('if-match')h:string|undefined){return this.r.resetFidoEnrollment(id,version(h));}
  @Post('staff/:id/disable') @Permissions('staff.manage') @RequireStepUp() disable(@Param('id')id:string,@Body()b:{reason?:string},@Headers('if-match')h:string|undefined){return this.r.disable(id,version(h),b?.reason);}
  @Post('staff/:id/enable') @Permissions('staff.manage') @RequireStepUp() enable(@Param('id')id:string,@Body()b:{reason?:string},@Headers('if-match')h:string|undefined){return this.r.enable(id,version(h),b?.reason);}
  @Put('staff/:id/roles') @Permissions('rbac.manage') @RequireStepUp() rolesSet(@Param('id')id:string,@Body()b:{role_ids:string[];reason?:string},@Headers('if-match')h:string|undefined,@Req()req:any){return this.r.setRoles(id,b.role_ids,version(h),req.actor?.id,b.reason);}
  @Put('staff/:id/scopes') @Permissions('rbac.manage') @RequireStepUp() scopesSet(@Param('id')id:string,@Body()b:{scopes:{scope_type:string;scope_id:string}[];reason?:string},@Headers('if-match')h:string|undefined){return this.r.setScopes(id,b.scopes,version(h),b.reason);}
}
