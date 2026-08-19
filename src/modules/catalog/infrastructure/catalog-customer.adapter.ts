import { Injectable } from '@nestjs/common';
import { CATALOG_CUSTOMER_PORT, CatalogCustomerPort } from '../application/ports/catalog-customer.port';
import { CatalogRepository } from './catalog.repository';

@Injectable()
export class CatalogCustomerAdapter implements CatalogCustomerPort{
  constructor(private readonly repo:CatalogRepository){}
  async productExists(productId:string):Promise<boolean>{return !!(await this.repo.adminProductById(productId));}
}
export { CATALOG_CUSTOMER_PORT };
