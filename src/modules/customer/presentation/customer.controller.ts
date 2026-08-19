import { Body,Controller,Delete,Get,HttpCode,HttpStatus,Param,Patch,Post,Query } from '@nestjs/common';
import { CustomerOnly,Permissions,RequireIdempotency,RequireStepUp,StaffOnly } from '../../../platform/auth/auth.decorators';
import { CustomerProfileService } from '../application/customer-profile.service';
import { CustomerAddressService } from '../application/customer-address.service';
import { CustomerWishlistService } from '../application/customer-wishlist.service';
import { CustomerWholesaleService } from '../application/customer-wholesale.service';

@Controller()
export class CustomerController{
  constructor(
    private readonly profile:CustomerProfileService,
    private readonly addresses:CustomerAddressService,
    private readonly wishlist:CustomerWishlistService,
    private readonly wholesale:CustomerWholesaleService,
  ){}

  @CustomerOnly() @Get('customer/profile') getProfile(){return this.profile.getProfile();}
  @CustomerOnly() @RequireIdempotency('customer.profile.update') @Patch('customer/profile') updateProfile(@Body() body:any){return this.profile.updateProfile(body??{});}

  @CustomerOnly() @Get('customer/addresses') listAddresses(){return this.addresses.list();}
  @CustomerOnly() @RequireIdempotency('customer.address.create') @Post('customer/addresses') createAddress(@Body() body:any){return this.addresses.create(body??{});}
  @CustomerOnly() @RequireIdempotency('customer.address.update') @Patch('customer/addresses/:id') updateAddress(@Param('id') id:string,@Body() body:any){return this.addresses.update(id,body??{});}
  @CustomerOnly() @RequireIdempotency('customer.address.set_default') @HttpCode(HttpStatus.OK) @Post('customer/addresses/:id/set-default') setDefaultAddress(@Param('id') id:string){return this.addresses.setDefault(id);}
  @CustomerOnly() @RequireIdempotency('customer.address.delete') @HttpCode(HttpStatus.NO_CONTENT) @Delete('customer/addresses/:id') async deleteAddress(@Param('id') id:string){await this.addresses.delete(id);}

  @CustomerOnly() @Get('customer/wishlist') listWishlist(){return this.wishlist.list();}
  @CustomerOnly() @RequireIdempotency('customer.wishlist.add') @HttpCode(HttpStatus.OK) @Post('customer/wishlist/:product_id') addWishlist(@Param('product_id') id:string){return this.wishlist.add(id);}
  @CustomerOnly() @RequireIdempotency('customer.wishlist.remove') @HttpCode(HttpStatus.NO_CONTENT) @Delete('customer/wishlist/:product_id') async removeWishlist(@Param('product_id') id:string){await this.wishlist.remove(id);}

  @CustomerOnly() @RequireIdempotency('customer.wholesale.submit') @Post('customer/wholesale/applications') submitWholesale(@Body() body:any){return this.wholesale.submit(body??{});}
  @CustomerOnly() @Get('customer/wholesale/application') myWholesale(){return this.wholesale.myApplication();}
}

@Controller('admin/wholesale/applications')
@StaffOnly()
export class CustomerWholesaleAdminController{
  constructor(private readonly wholesale:CustomerWholesaleService){}

  @Permissions('customer.wholesale.view') @Get() list(@Query('status') status?:string){return this.wholesale.listAdmin(status);}
  @Permissions('customer.wholesale.view') @Get(':id') get(@Param('id') id:string){return this.wholesale.getAdmin(id);}
  @Permissions('customer.wholesale.review') @RequireIdempotency('customer.wholesale.start_review') @HttpCode(HttpStatus.OK) @Post(':id/start-review') start(@Param('id') id:string,@Body() body:any){return this.wholesale.startReview(id,body?.comment);}
  @Permissions('customer.wholesale.decide') @RequireStepUp() @RequireIdempotency('customer.wholesale.approve') @HttpCode(HttpStatus.OK) @Post(':id/approve') approve(@Param('id') id:string,@Body() body:any){return this.wholesale.approve(id,body?.comment);}
  @Permissions('customer.wholesale.decide') @RequireStepUp() @RequireIdempotency('customer.wholesale.reject') @HttpCode(HttpStatus.OK) @Post(':id/reject') reject(@Param('id') id:string,@Body() body:any){return this.wholesale.reject(id,body?.reason);}
}
