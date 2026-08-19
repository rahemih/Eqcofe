import { Injectable } from '@nestjs/common';
import { ReturnsService } from '../returns.service';
import { ReturnCustomerReadPort } from './return-customer-read.port';

@Injectable()
export class ReturnCustomerReadService implements ReturnCustomerReadPort{
  constructor(private readonly returns:ReturnsService){}
  list(){return this.returns.listCustomer();}
  get(returnNumber:string){return this.returns.getCustomer(returnNumber);}
  timeline(returnNumber:string){return this.returns.timelineCustomer(returnNumber);}
}
