export type ProductStatus='draft'|'review'|'published'|'archived';
export type EntityStatus='active'|'inactive';
export type MediaStatus='uploading'|'quarantine'|'processing'|'active'|'rejected'|'deleted';
export interface ProductState { id:string; brandId:string|null; primaryCategoryId:string; nameFa:string; nameEn:string|null; slug:string; shortDescription:string|null; description:string|null; status:ProductStatus; salesEnabled:boolean; publishedAt:Date|null; archivedAt:Date|null; archiveReason:string|null; version:number; }
export interface VariantState { id:string; productId:string; sku:string; barcode:string|null; nameSuffix:string|null; status:EntityStatus; salesEnabled:boolean; weightGrams:number|null; version:number; }
export interface BrandState { id:string; nameFa:string; nameEn:string|null; slug:string; description:string|null; status:EntityStatus; salesEnabled:boolean; version:number; }
export interface CategoryState { id:string; parentId:string|null; nameFa:string; slug:string; description:string|null; status:EntityStatus; salesEnabled:boolean; sortOrder:number; version:number; }
