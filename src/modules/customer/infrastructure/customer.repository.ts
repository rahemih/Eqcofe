import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor,TransactionManager } from '../../../platform/database/transaction-manager';

export interface CustomerProfileRow {
  id:string;
  account_id:string|null;
  customer_type:'retail'|'wholesale';
  first_name:string|null;
  last_name:string|null;
  mobile_normalized:string|null;
  email_normalized:string|null;
  status:'active'|'disabled'|'anonymized';
  registered_at:Date;
  created_at:Date;
  updated_at:Date;
  version:string|number|bigint;
}

export interface CustomerAddressRow {
  id:string;customer_id:string;recipient_name:string;recipient_mobile:string;province_id:string;city_id:string;postal_code:string;address_line:string;
  building_no:string|null;unit_no:string|null;location_metadata:Record<string,unknown>|null;is_default_shipping:boolean;created_at:Date;updated_at:Date;version:string|number|bigint;
}


export interface CustomerWishlistRow {
  customer_id:string;product_id:string;created_at:Date;
}

export interface CustomerAddressCreate {
  customerId:string;recipientName:string;recipientMobile:string;provinceId:string;cityId:string;postalCode:string;addressLine:string;
  buildingNo:string|null;unitNo:string|null;locationMetadata:Record<string,unknown>;isDefault:boolean;
}

@Injectable()
export class CustomerRepository{
  constructor(private readonly tx:TransactionManager){}
  db(){return this.tx.readonly();}

  async profileById(customerId:string,ex:DatabaseExecutor=this.db()):Promise<CustomerProfileRow|null>{
    const r=await sql<CustomerProfileRow>`SELECT id,account_id,customer_type,first_name,last_name,mobile_normalized,email_normalized,status,registered_at,created_at,updated_at,version
      FROM customer.customers WHERE id=${customerId}::uuid LIMIT 1`.execute(ex);
    return r.rows[0]??null;
  }

  async updateProfile(
    ex:DatabaseExecutor,
    input:{customerId:string;expectedVersion:number;firstName:string|null;lastName:string|null;emailNormalized:string|null},
  ):Promise<CustomerProfileRow|null>{
    const r=await sql<CustomerProfileRow>`UPDATE customer.customers
      SET first_name=${input.firstName},last_name=${input.lastName},email_normalized=${input.emailNormalized},version=version+1,updated_at=now()
      WHERE id=${input.customerId}::uuid AND version=${input.expectedVersion} AND status='active'
      RETURNING id,account_id,customer_type,first_name,last_name,mobile_normalized,email_normalized,status,registered_at,created_at,updated_at,version`.execute(ex);
    return r.rows[0]??null;
  }

  async listAddresses(customerId:string,ex:DatabaseExecutor=this.db()):Promise<CustomerAddressRow[]>{
    const r=await sql<CustomerAddressRow>`SELECT id,customer_id,recipient_name,recipient_mobile,province_id,city_id,postal_code,address_line,building_no,unit_no,location_metadata,is_default_shipping,created_at,updated_at,version
      FROM customer.addresses WHERE customer_id=${customerId}::uuid ORDER BY is_default_shipping DESC,created_at DESC,id`.execute(ex);
    return r.rows;
  }

  async addressById(id:string,customerId:string,ex:DatabaseExecutor=this.db(),lock=false):Promise<CustomerAddressRow|null>{
    const q=lock?sql<CustomerAddressRow>`SELECT id,customer_id,recipient_name,recipient_mobile,province_id,city_id,postal_code,address_line,building_no,unit_no,location_metadata,is_default_shipping,created_at,updated_at,version FROM customer.addresses WHERE id=${id}::uuid AND customer_id=${customerId}::uuid FOR UPDATE`
      :sql<CustomerAddressRow>`SELECT id,customer_id,recipient_name,recipient_mobile,province_id,city_id,postal_code,address_line,building_no,unit_no,location_metadata,is_default_shipping,created_at,updated_at,version FROM customer.addresses WHERE id=${id}::uuid AND customer_id=${customerId}::uuid`;
    const r=await q.execute(ex);return r.rows[0]??null;
  }

  async createAddress(ex:DatabaseExecutor,input:CustomerAddressCreate):Promise<CustomerAddressRow>{
    const r=await sql<CustomerAddressRow>`INSERT INTO customer.addresses(customer_id,recipient_name,recipient_mobile,province_id,city_id,postal_code,address_line,building_no,unit_no,location_metadata,is_default_shipping)
      VALUES(${input.customerId}::uuid,${input.recipientName},${input.recipientMobile},${input.provinceId}::uuid,${input.cityId}::uuid,${input.postalCode},${input.addressLine},${input.buildingNo},${input.unitNo},${JSON.stringify(input.locationMetadata)}::jsonb,${input.isDefault})
      RETURNING id,customer_id,recipient_name,recipient_mobile,province_id,city_id,postal_code,address_line,building_no,unit_no,location_metadata,is_default_shipping,created_at,updated_at,version`.execute(ex);
    return r.rows[0]!;
  }

  async clearDefaultAddress(ex:DatabaseExecutor,customerId:string,exceptId?:string):Promise<void>{
    if(exceptId)await sql`UPDATE customer.addresses SET is_default_shipping=false,version=version+1,updated_at=now() WHERE customer_id=${customerId}::uuid AND is_default_shipping AND id<>${exceptId}::uuid`.execute(ex);
    else await sql`UPDATE customer.addresses SET is_default_shipping=false,version=version+1,updated_at=now() WHERE customer_id=${customerId}::uuid AND is_default_shipping`.execute(ex);
  }

  async updateAddress(ex:DatabaseExecutor,input:{id:string;customerId:string;expectedVersion:number;recipientName:string;recipientMobile:string;provinceId:string;cityId:string;postalCode:string;addressLine:string;buildingNo:string|null;unitNo:string|null;locationMetadata:Record<string,unknown>}):Promise<CustomerAddressRow|null>{
    const r=await sql<CustomerAddressRow>`UPDATE customer.addresses SET recipient_name=${input.recipientName},recipient_mobile=${input.recipientMobile},province_id=${input.provinceId}::uuid,city_id=${input.cityId}::uuid,postal_code=${input.postalCode},address_line=${input.addressLine},building_no=${input.buildingNo},unit_no=${input.unitNo},location_metadata=${JSON.stringify(input.locationMetadata)}::jsonb,version=version+1,updated_at=now()
      WHERE id=${input.id}::uuid AND customer_id=${input.customerId}::uuid AND version=${input.expectedVersion}
      RETURNING id,customer_id,recipient_name,recipient_mobile,province_id,city_id,postal_code,address_line,building_no,unit_no,location_metadata,is_default_shipping,created_at,updated_at,version`.execute(ex);
    return r.rows[0]??null;
  }

  async markDefaultAddress(ex:DatabaseExecutor,id:string,customerId:string,expectedVersion:number):Promise<CustomerAddressRow|null>{
    const r=await sql<CustomerAddressRow>`UPDATE customer.addresses SET is_default_shipping=true,version=version+1,updated_at=now() WHERE id=${id}::uuid AND customer_id=${customerId}::uuid AND version=${expectedVersion}
      RETURNING id,customer_id,recipient_name,recipient_mobile,province_id,city_id,postal_code,address_line,building_no,unit_no,location_metadata,is_default_shipping,created_at,updated_at,version`.execute(ex);
    return r.rows[0]??null;
  }

  async deleteAddress(ex:DatabaseExecutor,id:string,customerId:string,expectedVersion:number):Promise<boolean>{
    const r=await sql`DELETE FROM customer.addresses WHERE id=${id}::uuid AND customer_id=${customerId}::uuid AND version=${expectedVersion}`.execute(ex);
    return Number(r.numAffectedRows)===1;
  }

  async listWishlist(customerId:string,ex:DatabaseExecutor=this.db()):Promise<CustomerWishlistRow[]>{
    const r=await sql<CustomerWishlistRow>`SELECT customer_id,product_id,created_at FROM customer.wishlist_items WHERE customer_id=${customerId}::uuid ORDER BY created_at DESC,product_id`.execute(ex);
    return r.rows;
  }

  async addWishlistItem(ex:DatabaseExecutor,customerId:string,productId:string):Promise<CustomerWishlistRow|null>{
    const r=await sql<CustomerWishlistRow>`INSERT INTO customer.wishlist_items(customer_id,product_id) VALUES(${customerId}::uuid,${productId}::uuid) ON CONFLICT(customer_id,product_id) DO NOTHING RETURNING customer_id,product_id,created_at`.execute(ex);
    return r.rows[0]??null;
  }

  async removeWishlistItem(ex:DatabaseExecutor,customerId:string,productId:string):Promise<boolean>{
    const r=await sql`DELETE FROM customer.wishlist_items WHERE customer_id=${customerId}::uuid AND product_id=${productId}::uuid`.execute(ex);
    return Number(r.numAffectedRows)===1;
  }
}
