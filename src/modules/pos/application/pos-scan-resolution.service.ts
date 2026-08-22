import { Injectable } from '@nestjs/common';
import { PosVariantLookupKind, PosVariantLookupService } from '../../catalog/application/pos-variant-lookup.service';

@Injectable()
export class PosScanResolutionService {
  constructor(private readonly catalogLookup: PosVariantLookupService) {}

  resolve(input: { kind: PosVariantLookupKind; value: unknown }) {
    return this.catalogLookup.resolve(input);
  }
}
