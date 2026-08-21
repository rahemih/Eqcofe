import { Module } from '@nestjs/common';
import { CatalogController } from './presentation/catalog.controller';
import { CatalogRepository } from './infrastructure/catalog.repository';
import { ProductCommandService } from './application/product-command.service';
import { VariantCommandService } from './application/variant-command.service';
import { TaxonomyCommandService } from './application/taxonomy-command.service';
import { CatalogQueryService } from './application/catalog-query.service';
import { CatalogStructureService } from './application/catalog-structure.service';
import { SalesControlService } from './application/sales-control.service';
import { MediaService } from './application/media.service';
import { PosVariantLookupService } from './application/pos-variant-lookup.service';
import { PosVariantLookupRepository } from './infrastructure/pos-variant-lookup.repository';
import { PricingModule } from '../pricing/pricing.module';
import { MEDIA_STORAGE_PORT } from './application/ports/media-storage.port';
import { ConfiguredMediaStorageAdapter } from './infrastructure/configured-media-storage.adapter';
import { CATALOG_CUSTOMER_PORT } from './application/ports/catalog-customer.port';
import { CatalogCustomerAdapter } from './infrastructure/catalog-customer.adapter';

@Module({
  imports: [PricingModule],
  controllers: [CatalogController],
  providers: [
    CatalogRepository,
    ProductCommandService,
    VariantCommandService,
    TaxonomyCommandService,
    CatalogQueryService,
    MediaService,
    SalesControlService,
    CatalogStructureService,
    PosVariantLookupRepository,
    PosVariantLookupService,
    ConfiguredMediaStorageAdapter,
    { provide: MEDIA_STORAGE_PORT, useExisting: ConfiguredMediaStorageAdapter },
    CatalogCustomerAdapter,
    { provide: CATALOG_CUSTOMER_PORT, useExisting: CatalogCustomerAdapter },
  ],
  exports: [CatalogQueryService,PosVariantLookupService,CATALOG_CUSTOMER_PORT],
})
export class CatalogModule {}
