import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  IRAN_GEOGRAPHY_1404_SOURCE,
  IRAN_PROVINCES_1404,
  IRAN_CITIES_1404,
  isIranProvinceReference1404,
  isIranProvinceCityPair1404,
  citiesForIranProvince1404,
} from '../shared/reference/iran-geography-1404';

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('Step 63-F Iran 1404 geography snapshot is source-locked and internally consistent',()=>{
  assert.equal(IRAN_GEOGRAPHY_1404_SOURCE.year,1404);
  assert.equal(IRAN_GEOGRAPHY_1404_SOURCE.sourceCommit,'68687cf96cc1852d5d38c7283353c80829331758');
  assert.equal(IRAN_GEOGRAPHY_1404_SOURCE.license,'MIT');
  assert.equal(IRAN_PROVINCES_1404.length,31);
  assert.equal(IRAN_CITIES_1404.length,1481);
  assert.equal(new Set(IRAN_PROVINCES_1404.map(x=>x.id)).size,31);
  assert.equal(new Set(IRAN_CITIES_1404.map(x=>x.id)).size,1481);
  for(const province of IRAN_PROVINCES_1404)assert.match(province.id,UUID_RE);
  for(const city of IRAN_CITIES_1404){
    assert.match(city.id,UUID_RE);
    assert.equal(isIranProvinceReference1404(city.provinceId),true);
    assert.equal(isIranProvinceCityPair1404(city.provinceId,city.id),true);
  }
});

test('Step 63-F geography lookup validates province-city ownership and Tehran is present',()=>{
  const tehran=IRAN_PROVINCES_1404.find(x=>x.name==='تهران');
  assert.ok(tehran);
  const cities=citiesForIranProvince1404(tehran.id);
  assert.ok(cities.length>0);
  const tehranCity=cities.find(x=>x.name==='تهران');
  assert.ok(tehranCity);
  assert.equal(isIranProvinceCityPair1404(tehran.id,tehranCity.id),true);
  const other=IRAN_PROVINCES_1404.find(x=>x.id!==tehran.id);
  assert.ok(other);
  assert.equal(isIranProvinceCityPair1404(other.id,tehranCity.id),false);
  assert.equal(isIranProvinceCityPair1404(tehran.id,'00000000-0000-4000-8000-000000000000'),false);
});

test('Customer Address service is bound to canonical geography validation only for new/changed geography',()=>{
  const source=readFileSync('src/modules/customer/application/customer-address.service.ts','utf8');
  assert.match(source,/isIranProvinceCityPair1404/);
  assert.match(source,/ADDRESS_REFERENCE_INVALID/);
  assert.match(source,/this\.geography\(this\.uuid\(input\.province_id\),this\.uuid\(input\.city_id\)\)/);
  assert.match(source,/hasOwnProperty\.call\(input,'province_id'\).*hasOwnProperty\.call\(input,'city_id'\)/s);
  assert.doesNotMatch(source,/Math\.random|randomUUID|crypto\.randomUUID/);
});
