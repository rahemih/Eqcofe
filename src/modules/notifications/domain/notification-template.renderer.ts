import { DomainError } from '../../../shared/errors/domain-error';

export type TemplateChannel = 'sms'|'email'|'in_app';
export type NotificationTemplateRow = {
  id:string; template_key:string; channel:TemplateChannel; locale:string; version:number; status:'draft'|'active'|'retired';
  subject_template:string|null; body_template:string; required_variables:unknown; allowed_variables:unknown; strict_variables:boolean;
};
export type RenderedTemplate = {subject:string|null;body:string;variables:string[]};

const TOKEN=/{{\s*([a-zA-Z][a-zA-Z0-9_.-]{0,79})\s*}}/g;
const FORBIDDEN=/({{{|}}}|<%|%>|\$\{|\beval\b|\bprocess\.|\brequire\s*\(|\bimport\s*\()/i;
const SECRET_NAME=/(secret|password|token|api[_-]?key|private[_-]?key|credential|bearer)/i;

function stringArray(value:unknown,name:string){
  if(!Array.isArray(value)||value.some(v=>typeof v!=='string'||!/^[a-zA-Z][a-zA-Z0-9_.-]{0,79}$/.test(v)))
    throw new DomainError('NOTIFICATION_TEMPLATE_VARIABLES_INVALID',`${name} قالب نامعتبر است.`);
  return [...new Set(value as string[])];
}
function collect(src:string|null){const s=new Set<string>();if(!src)return s;for(const m of src.matchAll(TOKEN)){const key=m[1];if(key)s.add(key);}return s;}
function scalar(value:unknown,key:string){
  if(value===null||value===undefined)return '';
  if(['string','number','boolean'].includes(typeof value)){const s=String(value);if(s.length>4000)throw new DomainError('NOTIFICATION_TEMPLATE_VARIABLE_TOO_LARGE',`مقدار ${key} بیش از حد مجاز است.`);return s;}
  throw new DomainError('NOTIFICATION_TEMPLATE_VARIABLE_INVALID',`مقدار ${key} باید ساده باشد.`);
}

export class NotificationTemplateRenderer{
 validateSource(channel:TemplateChannel,subject:string|null,body:string,required:unknown,allowed:unknown){
  if(!['sms','email','in_app'].includes(channel))throw new DomainError('NOTIFICATION_TEMPLATE_CHANNEL_INVALID','کانال قالب نامعتبر است.');
  if(typeof body!=='string'||body.length<1||body.length>20000)throw new DomainError('NOTIFICATION_TEMPLATE_BODY_INVALID','متن قالب نامعتبر است.');
  if(channel==='email'&&(!subject||subject.length>500))throw new DomainError('NOTIFICATION_TEMPLATE_SUBJECT_REQUIRED','عنوان ایمیل الزامی است.');
  if(channel!=='email'&&subject&&subject.length>500)throw new DomainError('NOTIFICATION_TEMPLATE_SUBJECT_INVALID','عنوان قالب بیش از حد مجاز است.');
  for(const src of [subject,body])if(src&&FORBIDDEN.test(src))throw new DomainError('NOTIFICATION_TEMPLATE_UNSAFE_SOURCE','عبارت ناامن در قالب مجاز نیست.');
  const req=stringArray(required,'متغیرهای الزامی'),allow=stringArray(allowed,'متغیرهای مجاز');
  if(req.some(v=>!allow.includes(v)))throw new DomainError('NOTIFICATION_TEMPLATE_REQUIRED_NOT_ALLOWED','متغیر الزامی باید در فهرست مجاز باشد.');
  if([...req,...allow].some(v=>SECRET_NAME.test(v)))throw new DomainError('NOTIFICATION_TEMPLATE_SECRET_VARIABLE_FORBIDDEN','استفاده از متغیرهای حساس در قالب مجاز نیست.');
  const used=new Set([...collect(subject),...collect(body)]);
  for(const v of used)if(!allow.includes(v))throw new DomainError('NOTIFICATION_TEMPLATE_VARIABLE_NOT_ALLOWED',`متغیر ${v} در قالب مجاز نیست.`);
  return{required:req,allowed:allow,used:[...used]};
 }
 render(t:NotificationTemplateRow,vars:Record<string,unknown>):RenderedTemplate{
  const meta=this.validateSource(t.channel,t.subject_template,t.body_template,t.required_variables,t.allowed_variables);
  if(!vars||typeof vars!=='object'||Array.isArray(vars))throw new DomainError('NOTIFICATION_TEMPLATE_VARIABLES_INVALID','متغیرهای رندر نامعتبر است.');
  for(const key of meta.required)if(!(key in vars)||vars[key]===null||vars[key]===undefined||String(vars[key]).length===0)throw new DomainError('NOTIFICATION_TEMPLATE_VARIABLE_MISSING',`متغیر ${key} الزامی است.`);
  if(t.strict_variables)for(const key of Object.keys(vars))if(!meta.allowed.includes(key))throw new DomainError('NOTIFICATION_TEMPLATE_VARIABLE_NOT_ALLOWED',`متغیر ${key} مجاز نیست.`);
  const replace=(src:string|null)=>src===null?null:src.replace(TOKEN,(_,key)=>scalar(vars[key],key));
  const subject=replace(t.subject_template),body=replace(t.body_template)!;
  const bodyLimit=t.channel==='sms'?1600:50000;
  if(subject&&subject.length>500)throw new DomainError('NOTIFICATION_TEMPLATE_RENDER_TOO_LARGE','عنوان رندرشده بیش از حد مجاز است.');
  if(body.length<1||body.length>bodyLimit)throw new DomainError('NOTIFICATION_TEMPLATE_RENDER_TOO_LARGE','متن رندرشده بیش از حد مجاز است.');
  return{subject,body,variables:meta.used};
 }
}
