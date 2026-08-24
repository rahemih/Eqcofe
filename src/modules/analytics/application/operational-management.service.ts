import { Injectable } from '@nestjs/common';
import { AnalyticsProjectionRepository } from '../infrastructure/analytics-projection.repository';

type Kind='fulfillment'|'shipment'|'return'|'warranty';
export interface OperationalRow{id:string;orderId:string;status:string;startedAt:Date;completedAt:Date|null;ageSeconds:number;cycleSeconds:number|null;sourceVersion:number;sourceWatermark:Date;}
export interface OperationalDomainReadModel{totalCount:number;completedCount:number;averageCompletedCycleSeconds:number;countsByStatus:Record<string,number>;sourceWatermark:Date|null;rows:OperationalRow[];}
export interface OperationalManagementReadModel{asOf:Date;fulfillment:OperationalDomainReadModel;shipment:OperationalDomainReadModel;returns:OperationalDomainReadModel;warranty:OperationalDomainReadModel;}

const MAX_LIMIT=500;
const STATUSES:Record<Kind,Set<string>>={
  fulfillment:new Set(['unfulfilled','partially_allocated','allocated','preparing','partially_shipped','shipped','partially_delivered','delivered','cancelled']),
  shipment:new Set(['draft','ready','handed_over','in_transit','delivered','delivery_failed','cancelled','returned']),
  return:new Set(['requested','under_review','approved','rejected','in_transit_to_store','received','inspecting','resolved','cancelled']),
  warranty:new Set(['requested','under_review','approved','rejected','received','repairing','resolved','closed','cancelled']),
};
function date(value:unknown,code:string){const d=new Date(value as any);if(Number.isNaN(d.getTime()))throw new Error(code);return d;}
function limit(value:unknown){if(value==null||value==='')return MAX_LIMIT;const n=Number(value);if(!Number.isInteger(n)||n<1||n>MAX_LIMIT)throw new Error('ANALYTICS_LIMIT_INVALID');return n;}
function seconds(from:Date,to:Date){const n=Math.floor((to.getTime()-from.getTime())/1000);if(!Number.isSafeInteger(n)||n<0)throw new Error('ANALYTICS_OPERATIONAL_TIMELINE_INVALID');return n;}

@Injectable()
export class OperationalManagementService{
  constructor(private readonly repository:AnalyticsProjectionRepository){}
  async read(input:{from:unknown;to:unknown;asOf:unknown;limit?:unknown}):Promise<OperationalManagementReadModel>{
    const from=date(input?.from,'ANALYTICS_FROM_INVALID'),to=date(input?.to,'ANALYTICS_TO_INVALID'),asOf=date(input?.asOf,'ANALYTICS_AS_OF_INVALID'),bounded=limit(input?.limit);
    if(from>to||to>asOf)throw new Error('ANALYTICS_OPERATIONAL_WINDOW_INVALID');
    const [fulfillment,shipment,returns,warranty]=await Promise.all([
      this.domain('fulfillment',from,to,asOf,bounded),this.domain('shipment',from,to,asOf,bounded),
      this.domain('return',from,to,asOf,bounded),this.domain('warranty',from,to,asOf,bounded),
    ]);
    return{asOf,fulfillment,shipment,returns,warranty};
  }
  private async domain(kind:Kind,from:Date,to:Date,asOf:Date,bounded:number):Promise<OperationalDomainReadModel>{
    const rows:OperationalRow[]=(await this.repository.operationalMetrics(kind,from,to,bounded)).map((r:any)=>{
      const status=String(r.status);if(!STATUSES[kind].has(status))throw new Error('ANALYTICS_OPERATIONAL_STATUS_INVALID');
      const startedAt=date(r.started_at,'ANALYTICS_OPERATIONAL_STARTED_AT_INVALID');
      const completedAt=r.completed_at==null?null:date(r.completed_at,'ANALYTICS_OPERATIONAL_COMPLETED_AT_INVALID');
      const sourceWatermark=date(r.source_watermark,'ANALYTICS_SOURCE_WATERMARK_INVALID');
      const sourceVersion=Number(r.source_version);if(!Number.isSafeInteger(sourceVersion)||sourceVersion<1)throw new Error('ANALYTICS_SOURCE_VERSION_INVALID');
      return{id:String(r.id),orderId:String(r.order_id),status,startedAt,completedAt,ageSeconds:seconds(startedAt,asOf),cycleSeconds:completedAt?seconds(startedAt,completedAt):null,sourceVersion,sourceWatermark};
    });
    const countsByStatus:Record<string,number>={};let completedCount=0,totalCycle=0,sourceWatermark:Date|null=null;
    for(const row of rows){countsByStatus[row.status]=(countsByStatus[row.status]??0)+1;if(row.cycleSeconds!=null){completedCount++;totalCycle+=row.cycleSeconds;if(!Number.isSafeInteger(totalCycle))throw new Error('ANALYTICS_RESULT_INTEGER_OUT_OF_RANGE');}if(!sourceWatermark||row.sourceWatermark>sourceWatermark)sourceWatermark=row.sourceWatermark;}
    return{totalCount:rows.length,completedCount,averageCompletedCycleSeconds:completedCount?Math.floor(totalCycle/completedCount):0,countsByStatus,sourceWatermark,rows};
  }
}
