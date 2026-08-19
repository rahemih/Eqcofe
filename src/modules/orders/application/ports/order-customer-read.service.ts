import { Injectable } from '@nestjs/common';
import { OrderService } from '../order.service';
import { OrderCustomerReadPort } from './order-customer-read.port';

@Injectable()
export class OrderCustomerReadService implements OrderCustomerReadPort{
  constructor(private readonly orders:OrderService){}
  list(cursor?:string,limit=25){return this.orders.listCustomer(cursor,limit);}
  get(orderNumber:string){return this.orders.getCustomer(orderNumber);}
  timeline(orderNumber:string){return this.orders.timelineCustomer(orderNumber);}
  invoice(orderNumber:string){return this.orders.invoiceCustomer(orderNumber);}
}
