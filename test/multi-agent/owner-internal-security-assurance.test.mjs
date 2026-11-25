import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSURANCE_MODE, evaluateInternalSecurityEvidence } from '../../scripts/multi-agent/owner-internal-security-assurance.mjs';
const sha='a'.repeat(40), hash='b'.repeat(64), task='EQCOFE-STEP70-G-B1-BACKEND-REASON-ALIAS-001';
const cfg={mode:ASSURANCE_MODE,governance_issue:'https://github.com/rahemih/Eqcofe/issues/399',risk_acknowledgement:'NO_INDEPENDENT_HUMAN_SECURITY_REVIEW'};
function fixture(){
 const checks=['Analyze (actions)','Analyze (python)','Analyze (javascript-typescript)','CodeQL'].map((name,i)=>({id:i+1,name,head_sha:sha,status:'completed',conclusion:'success',app:{id:name==='CodeQL'?57789:15368}}));
 return {contract:{task_id:task,risk:'HIGH',risk_floor:'HIGH',human_gate_required:true,authorized_human_approver:{github_login:'rahemih'},owner_internal_security_assurance:cfg},head_sha:sha,artifact_hash:hash,
  current:{INTERNAL_SECURITY:{gate:'INTERNAL_SECURITY',status:'ASSESSED',task_id:task,head_sha:sha,artifact_hash:hash,author_login:'rahemih',source:'OWNER_ASSISTANT_INTERNAL_REVIEW',assurance_label:ASSURANCE_MODE,negative_security_tests_passed:true,unresolved_high:0,unresolved_critical:0,comment_id:20,report_url:'https://github.com/rahemih/Eqcofe/issues/399#issuecomment-10'},
    OWNER_RISK:{gate:'OWNER_RISK',status:'ACCEPTED',task_id:task,head_sha:sha,artifact_hash:hash,author_login:'rahemih',source:'PROJECT_OWNER_EXPLICIT_RISK_ACCEPTANCE',governance_issue:cfg.governance_issue,acknowledges_absent_independent_human_reviewer:true,comment_id:30}},
  check_runs:checks};
}
function result(mutate){const f=fixture();mutate?.(f);return evaluateInternalSecurityEvidence(f)}
test('internal evidence is identified as NON-INDEPENDENT and is not a merger or SECURITY PASS',()=>{const x=result();assert.equal(x.status,'INTERNAL_EVIDENCE_VERIFIED');assert.equal(x.human_reviewer_independent,false);assert.equal(Object.hasOwn(x,'merge_eligible'),false);assert.equal(Object.hasOwn(x,'security_pass'),false)});
test('owner risk approval must be exact-artifact, not stale',()=>{assert.ok(result(f=>{f.current.OWNER_RISK.artifact_hash='c'.repeat(64)}).blockers.includes('EXACT_ARTIFACT_OWNER_RISK_ACCEPTANCE_MISSING'))});
test('internal findings must be closed and negative tests pass',()=>{assert.ok(result(f=>{f.current.INTERNAL_SECURITY.unresolved_high=1}).blockers.includes('INTERNAL_SECURITY_ASSESSMENT_INVALID'));assert.ok(result(f=>{f.current.INTERNAL_SECURITY.negative_security_tests_passed=false}).blockers.includes('INTERNAL_SECURITY_ASSESSMENT_INVALID'))});
test('wrong account and missing report fail closed',()=>{assert.ok(result(f=>{f.current.INTERNAL_SECURITY.author_login='rahemih2'}).blockers.includes('INTERNAL_SECURITY_ASSESSMENT_INVALID'));assert.ok(result(f=>{f.current.INTERNAL_SECURITY.report_url='https://evil.example/x'}).blockers.includes('INTERNAL_SECURITY_ASSESSMENT_INVALID'))});
test('unallowlisted task or missing opt-in is blocked',()=>{assert.ok(result(f=>{f.contract.task_id='OTHER';f.current.INTERNAL_SECURITY.task_id='OTHER';f.current.OWNER_RISK.task_id='OTHER'}).blockers.includes('INTERNAL_TASK_NOT_ALLOWLISTED'));assert.ok(result(f=>{delete f.contract.owner_internal_security_assurance}).blockers.includes('INTERNAL_CONTRACT_OPT_IN_MISSING'))});
test('HIGH risk, Human Gate and exact sha hashes cannot be lowered',()=>{assert.ok(result(f=>{f.contract.risk='MEDIUM';f.contract.human_gate_required=false}).blockers.includes('HIGH_RISK_HUMAN_GATE_NOT_PRESERVED'));assert.ok(result(f=>{f.head_sha='not-a-sha'}).blockers.includes('EXACT_ARTIFACT_INVALID'))});
test('missing, skipped, failed or wrong-provider CodeQL blocks',()=>{assert.ok(result(f=>{f.check_runs=[]}).blockers.includes('CODEQL_AGGREGATE_NOT_PASS'));assert.ok(result(f=>{f.check_runs[0].conclusion='failure'}).blockers.includes('CODEQL_ANALYSIS_NOT_PASS:Analyze (actions)'));assert.ok(result(f=>{f.check_runs[0].app.id=99}).blockers.includes('CODEQL_ANALYSIS_NOT_PASS:Analyze (actions)'));assert.ok(result(f=>{f.check_runs[3].conclusion='neutral'}).blockers.includes('CODEQL_AGGREGATE_NOT_PASS'));assert.ok(result(f=>{f.check_runs=null}).blockers.includes('CODEQL_PROVIDER_DATA_MISSING'))});
test('latest exact provider failure cannot be overridden by earlier green check',()=>{assert.ok(result(f=>{f.check_runs.push({...f.check_runs[0],id:50,conclusion:'failure'})}).blockers.includes('CODEQL_ANALYSIS_NOT_PASS:Analyze (actions)'))});

test('Gate comments must be distinct, chronological and cannot bundle HUMAN risk acceptance',()=>{
  assert.ok(result(f=>{f.current.OWNER_RISK.comment_id=20}).blockers.includes('INTERNAL_GATE_SEPARATION_ORDER_INVALID'));
  assert.ok(result(f=>{f.current.INTERNAL_SECURITY.comment_id=40}).blockers.includes('INTERNAL_GATE_SEPARATION_ORDER_INVALID'));
  assert.ok(result(f=>{f.current.HUMAN={comment_id:30}}).blockers.includes('INTERNAL_GATE_SEPARATION_ORDER_INVALID'));
  assert.ok(result(f=>{f.current.HUMAN={comment_id:31}}).blockers.length===0);
  assert.ok(result(f=>{delete f.current.INTERNAL_SECURITY.comment_id}).blockers.includes('INTERNAL_GATE_SEPARATION_ORDER_INVALID'));
});
test('Internal assessment must link to a specific evidence comment, not a generic issue',()=>{
  assert.ok(result(f=>{f.current.INTERNAL_SECURITY.report_url='https://github.com/rahemih/Eqcofe/issues/399'}).blockers.includes('INTERNAL_SECURITY_ASSESSMENT_INVALID'));
  assert.ok(result(f=>{f.current.INTERNAL_SECURITY.report_url='https://github.com/rahemih/Eqcofe/pull/403#issuecomment-31'}).blockers.length===0);
});

test('Step70-G governance allowlist R2 grants only explicit HIGH task opt-ins, never a wildcard',()=>{
  for(const taskId of [
    'EQCOFE-STEP70-G-OWNER-INTERNAL-ASSURANCE-ALLOWLIST-002',
    'EQCOFE-STEP70-G-INVOICE-WAREHOUSE-SCOPE-001',
  ]){
    const actual=result(f=>{
      f.contract.task_id=taskId;
      f.current.INTERNAL_SECURITY.task_id=taskId;
      f.current.OWNER_RISK.task_id=taskId;
    });
    assert.equal(actual.status,'INTERNAL_EVIDENCE_VERIFIED',taskId);
    assert.equal(actual.human_reviewer_independent,false);
    assert.equal(Object.hasOwn(actual,'security_pass'),false);
  }
  const unrelated=result(f=>{
    f.contract.task_id='EQCOFE-STEP70-H-PROHIBITED-001';
    f.current.INTERNAL_SECURITY.task_id=f.contract.task_id;
    f.current.OWNER_RISK.task_id=f.contract.task_id;
  });
  assert.ok(unrelated.blockers.includes('INTERNAL_TASK_NOT_ALLOWLISTED'));
});
test('Step70-G new allowlisted task cannot evade exact task opt-in, HIGH floor or owner-risk',()=>{
  const setTask=f=>{
    f.contract.task_id='EQCOFE-STEP70-G-INVOICE-WAREHOUSE-SCOPE-001';
    f.current.INTERNAL_SECURITY.task_id='EQCOFE-STEP70-G-INVOICE-WAREHOUSE-SCOPE-001';
    f.current.OWNER_RISK.task_id='EQCOFE-STEP70-G-INVOICE-WAREHOUSE-SCOPE-001';
  };
  for(const alter of [
    f=>{delete f.contract.owner_internal_security_assurance;},
    f=>{f.contract.risk='MEDIUM';},
    f=>{f.contract.human_gate_required=false;},
    f=>{f.current.OWNER_RISK.artifact_hash='f'.repeat(64);},
    f=>{f.check_runs[0].app.id=42;},
  ]){
    const assessed=result(f=>{setTask(f);alter(f);});
    assert.equal(assessed.status,'BLOCKED');
  }
});

test('Step70-H exact task allowlist is opt-in only and can never widen to H2 or Step71',()=>{
  const optInIds=["EQCOFE-STEP70-H-OWNER-INTERNAL-ASSURANCE-ALLOWLIST-001","EQCOFE-STEP70-H-POS-WAREHOUSE-SCOPE-BACKEND-001","EQCOFE-STEP70-H1-POS-SCAN-SALE-ADMIN-001"];
  for(const taskId of optInIds){
    const v=result(f=>{f.contract.task_id=taskId;f.current.INTERNAL_SECURITY.task_id=taskId;f.current.OWNER_RISK.task_id=taskId;});
    assert.equal(v.status,'INTERNAL_EVIDENCE_VERIFIED',taskId);
    assert.equal(v.human_reviewer_independent,false);
    assert.equal(Object.hasOwn(v,'security_pass'),false);
  }
  for(const taskId of ['EQCOFE-STEP70-H2-POS-OFFLINE-RECONCILIATION-ADMIN-001','EQCOFE-STEP71-START-001','*','EQCOFE-STEP70-H-OTHER-001']){
    const v=result(f=>{f.contract.task_id=taskId;f.current.INTERNAL_SECURITY.task_id=taskId;f.current.OWNER_RISK.task_id=taskId;});
    assert.ok(v.blockers.includes('INTERNAL_TASK_NOT_ALLOWLISTED'),taskId);
  }
});
test('Step70-H assurance cannot evade explicit owner risk, codeql, HIGH floor or independent-in-time order',()=>{
  for(const taskId of ["EQCOFE-STEP70-H-OWNER-INTERNAL-ASSURANCE-ALLOWLIST-001","EQCOFE-STEP70-H-POS-WAREHOUSE-SCOPE-BACKEND-001","EQCOFE-STEP70-H1-POS-SCAN-SALE-ADMIN-001"]){
    for(const change of [
      f=>{delete f.contract.owner_internal_security_assurance;},
      f=>{f.contract.risk='MEDIUM';},
      f=>{f.contract.human_gate_required=false;},
      f=>{f.current.OWNER_RISK.artifact_hash='d'.repeat(64);},
      f=>{f.current.OWNER_RISK.comment_id=f.current.INTERNAL_SECURITY.comment_id;},
      f=>{f.check_runs[0].conclusion='failure';},
    ]){
      const v=result(f=>{f.contract.task_id=taskId;f.current.INTERNAL_SECURITY.task_id=taskId;f.current.OWNER_RISK.task_id=taskId;change(f)});
      assert.equal(v.status,'BLOCKED',taskId);
    }
  }
});
