export class NotificationRetryPolicy{
 backoffSeconds(attemptNo:number,baseSeconds:number,maxSeconds:number){const n=Math.max(1,attemptNo),base=Math.max(1,baseSeconds),cap=Math.max(base,maxSeconds);return Math.min(cap,base*Math.pow(2,Math.min(n-1,16)));}
}
