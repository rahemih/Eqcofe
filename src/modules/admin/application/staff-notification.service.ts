import { Inject,Injectable } from '@nestjs/common';
import { Kysely,sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { DatabaseExecutor } from '../../../platform/database/transaction-manager';
import { StaffNotificationPort } from './staff-notification.port';
@Injectable()
export class StaffNotificationService implements StaffNotificationPort{
 constructor(@Inject(KYSELY_DB)private readonly db:Kysely<DatabaseSchema>){}
 async resolve(staffId:string){const r=await sql<any>`SELECT sp.id,sp.status,a.status account_status,a.mobile_normalized,a.email_normalized FROM admin.staff_profiles sp JOIN iam.accounts a ON a.id=sp.account_id WHERE sp.id=${staffId}::uuid LIMIT 1`.execute(this.db);const x=r.rows[0];return x?{staffId:String(x.id),active:x.status==='active'&&x.account_status==='active',mobile:x.mobile_normalized?String(x.mobile_normalized):null,email:x.email_normalized?String(x.email_normalized):null}:null;}
 async activeWithPermission(ex:DatabaseExecutor,key:string){const r=await sql<any>`SELECT DISTINCT sp.id FROM admin.staff_profiles sp JOIN iam.accounts a ON a.id=sp.account_id JOIN admin.staff_roles sr ON sr.staff_id=sp.id AND (sr.expires_at IS NULL OR sr.expires_at>now()) JOIN admin.roles ro ON ro.id=sr.role_id AND ro.is_active=true JOIN admin.role_permissions rp ON rp.role_id=ro.id JOIN admin.permissions p ON p.id=rp.permission_id WHERE sp.status='active' AND a.status='active' AND p.key=${key} ORDER BY sp.id`.execute(ex);return r.rows.map(x=>String(x.id));}
}
