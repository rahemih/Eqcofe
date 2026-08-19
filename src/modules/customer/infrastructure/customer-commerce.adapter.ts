import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { CustomerCommercePort,CustomerCommerceType } from '../application/ports/customer-commerce.port';
import { CustomerRepository } from './customer.repository';

@Injectable()
export class CustomerCommerceAdapter implements CustomerCommercePort{
  constructor(private readonly repo:CustomerRepository){}

  async getCustomerType(customerId:string|null):Promise<CustomerCommerceType>{
    if(!customerId)return 'retail';
    const customer=await this.repo.profileById(customerId);
    if(!customer||customer.status!=='active')throw new DomainError('CUSTOMER_COMMERCE_UNAVAILABLE','حساب مشتری برای خرید فعال نیست.');
    return customer.customer_type==='wholesale'?'wholesale':'retail';
  }
}
