import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNotificationWorkerInteger } from '../apps/worker/notification-delivery-worker.service.ts';

test('Pilot MEDIUM: notification worker accepts bounded integer config and clamps finite integers',()=>{
 assert.equal(normalizeNotificationWorkerInteger('250',500,100,60000),250);
 assert.equal(normalizeNotificationWorkerInteger(50,500,100,60000),100);
 assert.equal(normalizeNotificationWorkerInteger(90000,500,100,60000),60000);
 assert.equal(normalizeNotificationWorkerInteger('75',25,1,100),75);
 assert.equal(normalizeNotificationWorkerInteger(0,25,1,100),1);
 assert.equal(normalizeNotificationWorkerInteger(500,25,1,100),100);
});

test('Pilot MEDIUM: notification worker falls back safely for malformed numeric config',()=>{
 for(const value of ['','   ','not-a-number','1.5',Number.NaN,Number.POSITIVE_INFINITY,undefined,null]){
  assert.equal(normalizeNotificationWorkerInteger(value,500,100,60000),500);
 }
});
