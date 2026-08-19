import test from 'node:test';import assert from 'node:assert/strict';import { NotificationRoutingPolicy } from '../src/modules/notifications/domain/notification-routing.policy';
const p=new NotificationRoutingPolicy();
test('routing only exposes available channels',()=>{assert.deepEqual(p.channels({subjectType:'customer',subjectId:'1',active:true,mobile:'+98912',email:null},['sms','email','in_app']),['sms','in_app']);});
test('inactive recipient fails closed',()=>{assert.throws(()=>p.channels({subjectType:'customer',subjectId:'1',active:false,mobile:'+98912',email:'a@b.c'}),/گیرنده اعلان فعال نیست/);});
test('email-only recipient routes email and in-app',()=>{assert.deepEqual(p.channels({subjectType:'customer',subjectId:'1',active:true,mobile:null,email:'a@b.c'}),['email','in_app']);});
test('unavailable requested channel is not spoofed',()=>{assert.deepEqual(p.channels({subjectType:'customer',subjectId:'1',active:true,mobile:null,email:'a@b.c'},['sms','email']),['email']);});
test('duplicate requested channels converge',()=>{assert.deepEqual(p.channels({subjectType:'customer',subjectId:'1',active:true,mobile:'+98912',email:null},['sms','sms']),['sms']);});
test('no valid route fails closed',()=>{assert.throws(()=>p.channels({subjectType:'internal',subjectId:'svc',active:true,mobile:null,email:null}),/هیچ کانال معتبری/);});
