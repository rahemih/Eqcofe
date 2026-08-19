from pathlib import Path
S=Path('src/modules/customer/application/customer-wholesale.service.ts').read_text()
R=Path('src/modules/customer/infrastructure/customer-wholesale.repository.ts').read_text()
M=Path('database/migrations/0026_customer_core.sql').read_text()
E=Path('src/modules/customer/domain/customer.events.ts').read_text()
checks={
'customer submit self scoped':"a?.type!=='customer'" in S,
'admin actions staff scoped':"a?.type!=='staff'" in S,
'active retail submit guard':"customer_type!=='retail'" in S and "status!=='active'" in S,
'one active app service guard':'this.repo.active' in S,
'one active app db guard':'uq_customer_wholesale_one_active_application' in M,
'submit event':'customer.wholesale_application.submitted.v1' in S,
'review state':'customer.wholesale_application.review_started.v1' in S,
'approve state':'customer.wholesale_application.approved.v1' in S,
'reject state':'customer.wholesale_application.rejected.v1' in S,
'type changed event':'customer.type_changed.v1' in S,
'row lock app':'FOR UPDATE' in R and 'async byId' in R,
'row lock customer':'async customer' in R and 'FOR UPDATE' in R,
'approve only under review':"status!=='under_review'" in S,
'reject only under review':'async reject' in R and "status='under_review'" in R,
'approval transaction':'async approve' in S and 'this.tx.run' in S,
'customer promotion in approval':'this.repo.promote' in S,
'promotion guarded by retail':'customer_type=\'retail\'' in R,
'db promotion approval guard':'CUSTOMER_WHOLESALE_APPROVAL_REQUIRED' in M,
'deferred approval integrity':'DEFERRABLE INITIALLY DEFERRED' in M,
'terminal immutable':'CUSTOMER_WHOLESALE_DECISION_IMMUTABLE' in M,
'invalid transition db guard':'CUSTOMER_WHOLESALE_INVALID_TRANSITION' in M,
'reviewer immutable':'CUSTOMER_WHOLESALE_REVIEWER_IMMUTABLE' in M,
'audit mutations':S.count('audit.writeWith')>=4,
'outbox mutations':S.count('outbox.append')>=4,
'no http controller in A7':'@Controller' not in S,
'wholesale event helper':'customerWholesaleEvent' in E,
}
failed=[k for k,v in checks.items() if not v]
for k,v in checks.items(): print(('PASS' if v else 'FAIL'),k)
print(f'{len(checks)-len(failed)}/{len(checks)} PASS')
raise SystemExit(1 if failed else 0)
