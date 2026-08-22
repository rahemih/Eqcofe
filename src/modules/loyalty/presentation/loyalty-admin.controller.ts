import { Body,Controller,Get,HttpCode,HttpStatus,Param,Post,Query } from '@nestjs/common';
import { Permissions,RequireIdempotency,RequireStepUp,StaffOnly } from '../../../platform/auth/auth.decorators';
import { LoyaltyAdminService } from '../application/loyalty-admin.service';

@Controller('admin/loyalty')
@StaffOnly()
export class LoyaltyAdminController {
  constructor(private readonly loyalty:LoyaltyAdminService){}

  @Permissions('loyalty.view') @Get('customers/:customerId/balance') balance(@Param('customerId') customerId:string){return this.loyalty.balance(customerId);}
  @Permissions('loyalty.view') @Get('customers/:customerId/history') history(@Param('customerId') customerId:string,@Query('limit') limit?:string){return this.loyalty.history(customerId,limit?Number(limit):100);}
  @Permissions('loyalty.adjust') @RequireStepUp() @RequireIdempotency('loyalty.points.adjust') @HttpCode(HttpStatus.OK) @Post('customers/:customerId/adjust') adjust(@Param('customerId') customerId:string,@Body() body:any){return this.loyalty.adjust(customerId,body??{});}
  @Permissions('loyalty.adjust') @RequireStepUp() @RequireIdempotency('loyalty.points.reverse') @HttpCode(HttpStatus.OK) @Post('customers/:customerId/entries/:entryId/reverse') reverse(@Param('customerId') customerId:string,@Param('entryId') entryId:string,@Body() body:any){return this.loyalty.reverse(customerId,entryId,body??{});}
}
