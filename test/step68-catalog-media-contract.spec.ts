import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
