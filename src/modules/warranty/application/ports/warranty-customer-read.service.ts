import { Injectable } from '@nestjs/common';
import { WarrantyService } from '../warranty.service';
import { WarrantyCustomerReadPort } from './warranty-customer-read.port';

@Injectable()
export class WarrantyCustomerReadService implements WarrantyCustomerReadPort{
  constructor(private readonly warranty:WarrantyService){}
  list(){return this.warranty.listCustomer();}
  get(claimNumber:string){return this.warranty.getCustomer(claimNumber);}
  timeline(claimNumber:string){return this.warranty.timelineCustomer(claimNumber);}
}
