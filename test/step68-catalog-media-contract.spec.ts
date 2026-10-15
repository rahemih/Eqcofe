import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { MediaService } from '../src/modules/catalog/application/media.service';

test('Step68-B authorizes GLB as the bounded 3D admin media capability', () => {
  const media = readFileSync('src/modules/catalog/application/media.service.ts','utf8');
  const structure = readFileSync('src/modules/catalog/application/catalog-structure.service.ts','utf8');
  const repo = readFileSync('src/modules/catalog/infrastructure/catalog.repository.ts','utf8');
  const migration = readFileSync('database/migrations/0064_catalog_media_3d.sql','utf8');

  assert.match(media, /'model\/gltf-binary'/);
  assert.match(structure, /'model_3d'/);
  assert.match(repo, /mimeType==='model\/gltf-binary'\?'model_3d'/);
  assert.match(migration, /media_type IN \('image','video','document','model_3d'\)/);
});

test('Step68-B does not silently expose 3D through the existing public Product Detail media query', () => {
  const repo = readFileSync('src/modules/catalog/infrastructure/catalog.repository.ts','utf8');
  assert.match(repo, /pm\.media_type IN \('image','video'\)/);
  assert.doesNotMatch(repo, /pm\.media_type IN \('image','video','model_3d'\)/);
});

test('Step68-B keeps GLB bounded and does not invent glTF external-resource support', () => {
  const media = readFileSync('src/modules/catalog/application/media.service.ts','utf8');
  assert.doesNotMatch(media, /model\/gltf\+json/);
  assert.doesNotMatch(media, /\.gltf/);
});


test('Step68-B generated OpenAPI TypeScript matches the canonical generator', async () => {
  const { execFileSync, spawnSync } = await import('node:child_process');
  const { mkdtempSync, readFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir=mkdtempSync(join(tmpdir(),'eqcofe-step68-openapi-'));
  const output=join(dir,'openapi.ts');
  const pnpm=process.platform==='win32'?'pnpm.cmd':'pnpm';
  try{
    execFileSync(pnpm,['exec','openapi-typescript','contracts/http/openapi.yaml','-o',output],{stdio:'pipe'});
    const actual=readFileSync('src/generated/openapi.ts','utf8');
    const expected=readFileSync(output,'utf8');
    if(actual!==expected){
      const diff=spawnSync('git',['diff','--no-index','--','src/generated/openapi.ts',output],{encoding:'utf8'});
      assert.fail('STEP68_B_GENERATED_OPENAPI_DRIFT\n'+String(diff.stdout||diff.stderr).slice(0,60000));
    }
  }finally{rmSync(dir,{recursive:true,force:true});}
});


test('Step68-B exposes typed JSON success bodies for all 46 frozen Admin Catalog/Media operations', () => {
  const design=JSON.parse(readFileSync('docs/13-product-design/step56-catalog-media-wireframes.json','utf8'));
  const api=parse(readFileSync('contracts/http/openapi.yaml','utf8'));
  const operations:string[]=[];
  const visit=(value:any):void=>{
    if(!value||typeof value!=='object')return;
    if(Array.isArray(value)){for(const item of value)visit(item);return;}
    if(typeof value.key==='string'&&/^(GET|POST|PUT|PATCH|DELETE) \/admin\//.test(value.key))operations.push(value.key);
    for(const item of Object.values(value))visit(item);
  };
  visit(design);
  const unique=[...new Set(operations)];
  assert.equal(unique.length,46);
  for(const key of unique){
    const [method,...parts]=key.split(' ');
    const path=parts.join(' ');
    const operation=api.paths?.[path]?.[method.toLowerCase()];
    assert.ok(operation, `missing OpenAPI operation: ${key}`);
    const success=Object.entries(operation.responses??{}).find(([status])=>/^20\d$/.test(status))?.[1] as any;
    assert.ok(success?.content?.['application/json']?.schema, `untyped success response: ${key}`);
  }
});

test('Step68-B Admin product response preserves editable source fields and own sales state', () => {
  const query=readFileSync('src/modules/catalog/application/catalog-query.service.ts','utf8');
  const api=parse(readFileSync('contracts/http/openapi.yaml','utf8'));
  assert.match(query,/short_description: product\.short_description \?\? null/);
  assert.match(query,/description: product\.description \?\? null/);
  assert.match(query,/sales_enabled: Boolean\(product\.sales_enabled\)/);
  assert.doesNotMatch(query,/sales_enabled: \(product\.effective_sales_enabled \?\? product\.sales_enabled\) && Boolean\(price\)/);
  assert.ok(api.components.schemas.AdminProductResponse.properties.short_description);
  assert.ok(api.components.schemas.AdminProductResponse.properties.description);
  assert.equal('url' in api.components.schemas.AdminPrimaryMediaRef.properties,false);
  assert.ok(api.components.schemas.AdminPrimaryMediaRef.properties.storage_key);
});

test('Step68-B media upload enforces purpose/MIME compatibility and GLB filename boundary', async () => {
  let created:any=null;
  const tx:any={run:async(fn:any)=>fn({}),readonly:()=>({})};
  const repo:any={createMedia:async(_trx:any,input:any)=>{created=input;}};
  const audit:any={writeWith:async()=>{}};
  const ctx:any={require:()=>({actor:{type:'staff',id:'00000000-0000-4000-8000-000000000001'},requestId:'r1'})};
  const storage:any={createUploadTarget:async()=>({method:'PUT',url:'https://upload.invalid',expiresAt:new Date('2030-01-01T00:00:00.000Z')})};
  const service=new MediaService(tx,repo,audit,ctx,storage);
  const checksum='a'.repeat(64);

  await assert.rejects(
    ()=>service.request({filename:'model.glb',mime_type:'video/mp4',size_bytes:10,checksum_sha256:checksum,purpose:'product_model_3d'}),
    (error:any)=>error?.code==='INVALID_MEDIA_PURPOSE',
  );
  await assert.rejects(
    ()=>service.request({filename:'model.bin',mime_type:'model/gltf-binary',size_bytes:10,checksum_sha256:checksum,purpose:'product_model_3d'}),
    (error:any)=>error?.code==='INVALID_MEDIA_UPLOAD',
  );
  const result:any=await service.request({filename:'model.glb',mime_type:'model/gltf-binary',size_bytes:10,checksum_sha256:checksum,purpose:'product_model_3d'});
  assert.equal(created?.mimeType,'model/gltf-binary');
  assert.match(result.storage_key,/\.glb$/);
});
