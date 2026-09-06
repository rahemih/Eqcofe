import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import ts from 'typescript';

export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
export function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? filesUnder(`${dir}/${e.name}`) : [`${dir}/${e.name}`]).sort();
}
export function openapiOperations() {
  const result = [];
  const seen = new Set();
  for (const file of readdirSync('contracts/http').filter((f) => /^openapi(?:-.+)?\.yaml$/.test(f)).sort()) {
    const source = `contracts/http/${file}`;
    const doc = parse(readFileSync(source, 'utf8'));
    for (const [path, item] of Object.entries(doc.paths ?? {})) {
      if (seen.has(path)) throw new Error(`Duplicate OpenAPI path ${path}`);
      seen.add(path);
      for (const [method, op] of Object.entries(item)) {
        if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(method)) continue;
        result.push({ key: `${method.toUpperCase()} ${path}`, path, method: method.toUpperCase(), operationId: op.operationId, source, security: op.security ?? doc.security ?? [], extensions: op['x-eqcofe'] ?? {}, parameters: [...(item.parameters ?? []), ...(op.parameters ?? [])] });
      }
    }
  }
  return result.sort((a, b) => a.key.localeCompare(b.key, 'en'));
}
const decorators = (node) => new Map((ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : []).map((d) => {
  const e = d.expression;
  return ts.isCallExpression(e) ? [e.expression.getText(), e.arguments.map((a) => ts.isStringLiteral(a) ? a.text : a.getText())] : [e.getText(), []];
}));
export function runtimeRoutes() {
  const routes = [];
  for (const source of filesUnder('src').filter((f) => f.endsWith('.controller.ts'))) {
    const tree = ts.createSourceFile(source, readFileSync(source, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const cls of tree.statements.filter(ts.isClassDeclaration)) {
      const cd = decorators(cls);
      if (!cd.has('Controller')) continue;
      for (const member of cls.members.filter(ts.isMethodDeclaration)) {
        const md = decorators(member);
        const route = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Head', 'Options'].find((m) => md.has(m));
        if (!route) continue;
        const path = '/' + [cd.get('Controller')?.[0], md.get(route)?.[0]].filter(Boolean).join('/').replace(/:([A-Za-z_][\w]*)/g, '{$1}');
        const effective = (key) => md.has(key) ? md.get(key) : cd.get(key);
        routes.push({ key: `${route.toUpperCase()} ${path}`, path, source, handler: member.name.getText(), line: tree.getLineAndCharacterOfPosition(member.getStart()).line + 1, module: source.split('/')[2], permissions: effective('Permissions') ?? [], staffOnly: effective('StaffOnly') !== undefined || effective('ActorTypes')?.includes('staff') === true, public: effective('Public') !== undefined, stepUp: effective('RequireStepUp') !== undefined, idempotencyScope: effective('RequireIdempotency')?.[0] ?? null });
      }
    }
  }
  return routes.sort((a, b) => a.key.localeCompare(b.key, 'en'));
}

export const routeShape = (key) => key.replace(/\{[^}]+\}/g, '{}');
export function adminEvidence() {
  const operations = openapiOperations().filter((o) => o.path.startsWith('/admin/'));
  const runtime = runtimeRoutes().filter((r) => r.path.startsWith('/admin/'));
  const supplementalSource = 'contracts/http/step49-pos-a9.yaml';
  const supplemental = parse(readFileSync(supplementalSource, 'utf8')).paths;
  const evidence = operations.map((o) => ({ key: o.key, openapi: { source: o.source, operationId: o.operationId, security: o.security, extensions: o.extensions }, runtime: runtime.find((r) => routeShape(r.key) === routeShape(o.key)) ?? null }));
  for (const r of runtime) {
    if (evidence.some((e) => e.runtime?.key === r.key)) continue;
    const entry = supplemental[r.path]?.[r.key.split(' ')[0].toLowerCase()];
    evidence.push({ key: r.key, openapi: null, supplemental: entry ? { source: supplementalSource, permission: entry['x-permission'] ?? null } : null, runtime: r });
  }
  return evidence.sort((a, b) => a.key.localeCompare(b.key, 'en'));
}
