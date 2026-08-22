from pathlib import Path
checks=[]
def check(name,cond): checks.append((name,bool(cond)))
ctl=Path('src/modules/content/presentation/content-admin.controller.ts').read_text()
svc=Path('src/modules/content/application/article-admin-query.service.ts').read_text()
repo=Path('src/modules/content/infrastructure/content.repository.ts').read_text()
mod=Path('src/modules/content/content.module.ts').read_text()
api=Path('contracts/http/openapi.yaml').read_text()
section=api[api.index('  /admin/content/articles:'):api.index('  /admin/ai/jobs:')]
patch=api[api.index('    PatchAdminContentArticlesIdRequest:'):api.index('    PostAdminAiJobsRequest:')]
check('controller registered', 'ContentAdminController' in mod)
check('admin prefix', "@Controller('admin/content/articles')" in ctl)
check('staff only', '@StaffOnly()' in ctl)
for perm in ['content.view','content.edit','content.review','content.publish','content.archive_restore']: check('permission '+perm,perm in ctl)
for scope in ['content.article.create','content.article.edit','content.article.submit_review','content.article.approve','content.article.schedule','content.article.publish','content.article.unpublish','content.article.archive','content.article.version.restore']: check('idempotency '+scope,scope in ctl)
check('step-up count',(ctl.count('@RequireStepUp()')>=6))
check('admin list repository','listAdminArticles' in repo)
check('status validation','CONTENT_STATUS_INVALID' in svc)
check('version validation','CONTENT_VERSION_INVALID' in svc)
check('openapi idempotency',section.count("#/components/parameters/IdempotencyKey")>=9)
check('openapi step-up',section.count('stepUpToken: []')>=6)
check('patch cannot schedule','scheduled_at:' not in patch)
failed=[n for n,v in checks if not v]
for n,v in checks: print(('PASS' if v else 'FAIL'),n)
print(f'{sum(v for _,v in checks)}/{len(checks)} PASS')
raise SystemExit(1 if failed else 0)
