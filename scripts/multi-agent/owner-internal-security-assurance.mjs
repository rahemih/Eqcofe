/**
 * An intentionally non-independent owner-accepted internal security evidence validator.
 * Used in the candidate Merge Policy Controller for a narrowly opted-in HIGH task.
 * Does not assert independent SECURITY PASS; requires governed activation.
 */
export const ASSURANCE_MODE = 'OWNER_ACCEPTED_INTERNAL_SECURITY_ASSURANCE';
const ISSUE = 'https://github.com/rahemih/Eqcofe/issues/399';
const ALLOWED_TASKS = new Set([
  'EQCOFE-STEP70-G-OWNER-INTERNAL-ASSURANCE-GOV-001',
  'EQCOFE-STEP70-G-OWNER-INTERNAL-ASSURANCE-ALLOWLIST-002',
  'EQCOFE-STEP70-G-INVOICE-WAREHOUSE-SCOPE-001',
  'EQCOFE-STEP70-G-B1-BACKEND-REASON-ALIAS-001',
  'EQCOFE-STEP70-G-B2-LANDED-SCOPE-001',
  'EQCOFE-STEP70-G-B2C-LANDED-CREATE-LINK-SCOPE-001',
  'EQCOFE-STEP70-G-B3-LANDED-OPENAPI-ALIGNMENT-001',
  'EQCOFE-STEP70-G-RECEIPT-LANDED-INVOICE-RETURN-ADMIN-001',
  'EQCOFE-STEP70-H-OWNER-INTERNAL-ASSURANCE-ALLOWLIST-001',
  'EQCOFE-STEP70-H-POS-WAREHOUSE-SCOPE-BACKEND-001',
  'EQCOFE-STEP70-H1-POS-SCAN-SALE-ADMIN-001',
  'EQCOFE-STEP70-H2-OWNER-INTERNAL-ASSURANCE-ALLOWLIST-001',
  'EQCOFE-STEP70-H2A-POS-OFFLINE-CAPTURE-SYNC-ADMIN-001',
  'EQCOFE-STEP70-H2B-POS-RECONCILIATION-ADMIN-001',
]);
const ANALYSES = ['Analyze (actions)', 'Analyze (python)', 'Analyze (javascript-typescript)'];
function passCheck(runs, name, appId, head) {
  const eligible = runs.filter(x => x?.name === name && x?.head_sha === head && Number(x?.app?.id) === appId)
    .sort((a,b) => Number(b.id || 0)-Number(a.id || 0));
  return eligible.length > 0 && eligible[0].status === 'completed' && eligible[0].conclusion === 'success';
}
export function evaluateInternalSecurityEvidence({contract, head_sha, artifact_hash, current, check_runs}) {
  const blockers = [];
  const cfg = contract?.owner_internal_security_assurance;
  const task = contract?.task_id;
  const owner = contract?.authorized_human_approver?.github_login?.toLowerCase();
  if (!ALLOWED_TASKS.has(task)) blockers.push('INTERNAL_TASK_NOT_ALLOWLISTED');
  if (cfg?.mode !== ASSURANCE_MODE || cfg?.governance_issue !== ISSUE
      || cfg?.risk_acknowledgement !== 'NO_INDEPENDENT_HUMAN_SECURITY_REVIEW') blockers.push('INTERNAL_CONTRACT_OPT_IN_MISSING');
  if (contract?.risk !== 'HIGH' || contract?.risk_floor !== 'HIGH'
      || contract?.human_gate_required !== true || !owner) blockers.push('HIGH_RISK_HUMAN_GATE_NOT_PRESERVED');
  if (!/^[a-f0-9]{40}$/i.test(head_sha || '') || !/^[a-f0-9]{64}$/i.test(artifact_hash || '')) blockers.push('EXACT_ARTIFACT_INVALID');
  const assessment=current?.INTERNAL_SECURITY;
  if (!assessment || assessment.gate !== 'INTERNAL_SECURITY' || assessment.status !== 'ASSESSED'
      || assessment.task_id !== task || assessment.head_sha !== head_sha
      || assessment.artifact_hash !== artifact_hash || assessment.author_login?.toLowerCase() !== owner
      || assessment.source !== 'OWNER_ASSISTANT_INTERNAL_REVIEW' || assessment.assurance_label !== ASSURANCE_MODE
      || assessment.negative_security_tests_passed !== true
      || assessment.unresolved_high !== 0 || assessment.unresolved_critical !== 0
      || typeof assessment.report_url !== 'string'
      || !/^https:\/\/github\.com\/rahemih\/Eqcofe\/(issues|pull)\/\d+#issuecomment-[1-9]\d*$/.test(assessment.report_url)) {
    blockers.push('INTERNAL_SECURITY_ASSESSMENT_INVALID');
  }
  const risk=current?.OWNER_RISK;
  if (!risk || risk.gate !== 'OWNER_RISK' || risk.status !== 'ACCEPTED'
      || risk.task_id !== task || risk.head_sha !== head_sha
      || risk.artifact_hash !== artifact_hash || risk.author_login?.toLowerCase() !== owner
      || risk.source !== 'PROJECT_OWNER_EXPLICIT_RISK_ACCEPTANCE'
      || risk.governance_issue !== ISSUE || risk.acknowledges_absent_independent_human_reviewer !== true) {
    blockers.push('EXACT_ARTIFACT_OWNER_RISK_ACCEPTANCE_MISSING');
  }
  // Three owner-attested decisions must be separate chronological GitHub comments.
  // The Project Owner's later HUMAN gate cannot be bundled with its RISK acceptance.
  const assessmentId = assessment?.comment_id;
  const riskId = risk?.comment_id;
  const humanId = current?.HUMAN?.comment_id;
  if (!Number.isSafeInteger(assessmentId) || assessmentId < 1
      || !Number.isSafeInteger(riskId) || riskId <= assessmentId
      || (current?.HUMAN && (!Number.isSafeInteger(humanId) || humanId <= riskId))) {
    blockers.push('INTERNAL_GATE_SEPARATION_ORDER_INVALID');
  }
  if (!Array.isArray(check_runs)) blockers.push('CODEQL_PROVIDER_DATA_MISSING');
  else {
    for (const name of ANALYSES) {
      if (!passCheck(check_runs,name,15368,head_sha)) blockers.push('CODEQL_ANALYSIS_NOT_PASS:' + name);
    }
    if (!passCheck(check_runs,'CodeQL',57789,head_sha)) blockers.push('CODEQL_AGGREGATE_NOT_PASS');
  }
  const unique=[...new Set(blockers)].sort();
  return Object.freeze({
    mode: ASSURANCE_MODE, human_reviewer_independent: false,
    status: unique.length === 0 ? 'INTERNAL_EVIDENCE_VERIFIED' : 'BLOCKED',
    blockers: Object.freeze(unique),
    // This helper NEVER outputs SECURITY:PASS or MERGE_ELIGIBLE.
  });
}
