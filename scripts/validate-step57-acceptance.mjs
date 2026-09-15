import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = 'docs/13-product-design';
const prototypeRoot = `${root}/step57-prototype`;
const read = (path) => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));

export function validateStep57Acceptance(contract) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };

  try {
    const storefront = contract.screens.filter((screen) => screen.area === 'storefront');
    const admin = contract.screens.filter((screen) => screen.area === 'admin');
    const gateCounts = Object.fromEntries(
      ['B', 'C', 'D', 'E', 'F', 'G'].map((gate) => [
        gate,
        admin.filter((screen) => screen.id.startsWith(`AD-${gate}-`)).length,
      ]),
    );

    check(contract.step === 57 && contract.status === 'IN_PROGRESS', 'Step 57 acceptance must remain IN_PROGRESS before human approval');
    check(contract.closure.visualReview === 'PENDING', 'Visual review cannot be auto-approved');
    check(contract.closure.interactionReview === 'PENDING', 'Interaction review cannot be auto-approved');
    check(contract.closure.accessibilityReview === 'PENDING', 'Accessibility review cannot be auto-approved');
    check(contract.closure.exactHeadCI === 'PENDING', 'Exact-head CI closure evidence cannot be pre-written');
    check(contract.closure.merge === 'PENDING', 'Merge closure evidence cannot be pre-written');

    check(storefront.length === 37, `Expected 37 storefront surfaces, found ${storefront.length}`);
    check(admin.length === 97, `Expected 97 admin surfaces, found ${admin.length}`);
    check(JSON.stringify(gateCounts) === JSON.stringify({ B: 7, C: 8, D: 21, E: 11, F: 16, G: 34 }), `Admin gate ownership drift: ${JSON.stringify(gateCounts)}`);
    check(JSON.stringify(contract.viewports) === '[320,360,600,840,1200,1440]', 'Six-width responsive acceptance inventory drift');
    check(contract.journeys.length === 24, `Expected 24 journeys, found ${contract.journeys.length}`);

    const operationIds = new Set(admin.flatMap((screen) => screen.operations || []));
    const blockedOperationIds = new Set(admin.flatMap((screen) => screen.blockedOperations || []));
    const adminViews = admin.flatMap((screen) => screen.views || []);
    const adminStates = admin.flatMap((screen) => screen.states || []);

    check(operationIds.size === 532, `Expected 532 inherited admin operations, found ${operationIds.size}`);
    check(blockedOperationIds.size === 186, `Expected 186 NO_ACTION operations, found ${blockedOperationIds.size}`);
    check(adminViews.length === 1142, `Expected 1142 inherited admin views, found ${adminViews.length}`);
    check(adminStates.length === 4472, `Expected 4472 inherited admin states, found ${adminStates.length}`);

    for (const screen of admin) {
      const viewIds = new Set((screen.views || []).map((view) => view.id));
      check(viewIds.size > 0, `Admin surface has no views: ${screen.id}`);
      check(Boolean(screen.title && screen.task), `Admin surface missing title/task: ${screen.id}`);
      check(screen.reviewStatus === 'PENDING', `Admin surface was auto-approved: ${screen.id}`);

      for (const mapping of screen.operationViews || []) {
        check((screen.operations || []).includes(mapping.operation), `Operation/view mapping references foreign operation: ${screen.id} ${mapping.operation}`);
        check(viewIds.has(mapping.view), `Operation/view mapping references missing view: ${screen.id} ${mapping.view}`);
      }

      for (const operation of screen.blockedOperations || []) {
        check((screen.operations || []).includes(operation), `Blocked operation is not owned by surface: ${screen.id} ${operation}`);
        const mappings = (screen.operationViews || []).filter((mapping) => mapping.operation === operation);
        check(mappings.length > 0, `Blocked operation has no visible view disposition: ${screen.id} ${operation}`);
        check(mappings.every((mapping) => String(mapping.executionAuthority || '').startsWith('NO_ACTION')), `Blocked operation lost NO_ACTION authority: ${screen.id} ${operation}`);
      }
    }

    for (const screen of storefront) {
      check(Boolean(screen.title && screen.task), `Storefront surface missing title/task: ${screen.id}`);
      check(screen.reviewStatus === 'PENDING', `Storefront surface was auto-approved: ${screen.id}`);
    }

    const adminSource = readFileSync(`${prototypeRoot}/src/AdminSurface.jsx`, 'utf8');
    const storeSource = readFileSync(`${prototypeRoot}/src/StoreSurface.jsx`, 'utf8');
    const surfaceCss = readFileSync(`${prototypeRoot}/src/surface.css`, 'utf8');

    check(adminSource.includes("screen.blockedOperations.includes(o.operation)"), 'Prototype no longer consults per-surface blocked operations');
    check(adminSource.includes("startsWith('NO_ACTION')"), 'Prototype no longer enforces NO_ACTION execution authority');
    check(adminSource.includes('<button disabled>'), 'Unavailable admin action no longer renders disabled control');
    check(adminSource.includes('امکان ثبت یا دور زدن محدودیت وجود ندارد'), 'Unavailable admin action lost explicit restriction copy');
    check(adminSource.includes('هیچ درخواست واقعی ارسال نخواهد شد'), 'Admin review lost no-real-request disclosure');
    check(storeSource.includes('compare.length<4'), 'Storefront compare limit drifted from four items');
    check(storeSource.includes('تومان'), 'Storefront lost Toman presentation');
    check(!storeSource.includes('کیف پول') && !adminSource.includes('کیف پول'), 'Wallet reappeared in Step 57 prototype');
    check(surfaceCss.includes(':focus-visible') && surfaceCss.includes('outline:3px solid var(--eq-blue-700)'), 'Admin visible-focus contract drift');

    check(contract.constraints.rtl === true, 'RTL constraint drift');
    check(contract.constraints.language === 'fa', 'Persian language constraint drift');
    check(contract.constraints.currency === 'integer Toman', 'Toman currency constraint drift');
    check(contract.constraints.wallet === false, 'Wallet constraint drift');
    check(contract.constraints.brown === false, 'No-brown constraint drift');
    check(contract.constraints.runtimeChanges === false, 'Step 57 attempted runtime changes');
    check(contract.constraints.permissionReconciliation === false, 'Step 57 attempted permission reconciliation');
  } catch (error) {
    errors.push(error.message);
  }

  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const contract = read(`${root}/step57-high-fidelity-contract.json`);
  const errors = validateStep57Acceptance(contract);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Step57 deterministic acceptance PASS: 37 storefront, 97 admin, 24 journeys, 532 operations, 186 NO_ACTION; human visual/accessibility approval remains PENDING');
}
