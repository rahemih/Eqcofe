import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const contractPath = 'docs/13-product-design/step54-design-system-contract.json';
const outputs = {
  css: 'docs/13-product-design/generated/eqcofe-design-tokens.css',
  manifest: 'docs/13-product-design/generated/eqcofe-design-system.manifest.json',
  catalog: 'docs/13-product-design/generated/EQCOFE-DESIGN-SYSTEM-CATALOG.md'
};

const source = readFileSync(contractPath, 'utf8');
const contract = JSON.parse(source);
const generated = {
  [outputs.css]: renderCss(contract),
  [outputs.manifest]: `${JSON.stringify(renderManifest(contract, source), null, 2)}\n`,
  [outputs.catalog]: renderCatalog(contract)
};

if (process.argv.includes('--check')) {
  const drift = [];
  for (const [file, expected] of Object.entries(generated)) {
    let actual;
    try {
      actual = readFileSync(file, 'utf8');
    } catch {
      drift.push(`${file}: missing`);
      continue;
    }
    if (actual !== expected) drift.push(`${file}: does not match ${contractPath}`);
  }
  if (drift.length) {
    console.error(drift.join('\n'));
    process.exit(1);
  }
  console.log(`Step 54 repository library: PASS (${Object.keys(generated).length} deterministic artifacts)`);
} else {
  for (const [file, content] of Object.entries(generated)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  console.log(`Generated ${Object.keys(generated).length} Step 54 repository-library artifacts.`);
}

function renderCss(value) {
  const lines = [
    '/* Generated from step54-design-system-contract.json. Do not edit by hand. */',
    ':root {',
    `  --eq-font-family: ${quoteFontStack(value.typography.primary, value.typography.fallbacks)};`
  ];

  for (const [name, color] of Object.entries(value.primitives.color)) {
    lines.push(`  ${cssName(name)}: ${color};`);
  }
  for (const [name, primitive] of Object.entries(value.semanticColor.light)) {
    lines.push(`  ${cssName(`color/${name}`)}: var(${cssName(primitive)});`);
  }
  for (const group of ['spacing', 'radius', 'size', 'border', 'duration']) {
    for (const [name, tokenValue] of Object.entries(value.primitives[group])) {
      const unit = group === 'duration' ? 'ms' : 'px';
      lines.push(`  ${cssName(`${group}/${name}`)}: ${tokenValue}${unit};`);
    }
  }
  for (const [name, style] of Object.entries(value.typography.styles)) {
    lines.push(`  ${cssName(`type/${name}/font-size`)}: ${style.fontSize}px;`);
    lines.push(`  ${cssName(`type/${name}/line-height`)}: ${style.lineHeight}px;`);
    lines.push(`  ${cssName(`type/${name}/font-weight`)}: ${style.weight};`);
  }
  for (const [name, effect] of Object.entries(value.effects)) {
    lines.push(`  ${cssName(`effect/${name}`)}: ${effect};`);
  }
  lines.push('}', '');
  return `${lines.join('\n')}\n`;
}

function renderManifest(value, rawSource) {
  const metricCount = ['spacing', 'radius', 'size', 'border', 'duration']
    .reduce((sum, group) => sum + Object.keys(value.primitives[group]).length, 0);
  return {
    schemaVersion: '1.0.0',
    step: 54,
    sourceContract: contractPath,
    sourceSha256: createHash('sha256').update(rawSource).digest('hex'),
    canonicalLibrary: 'repository',
    figmaMirror: {
      role: 'optional-free-tier-companion',
      status: value.repositoryLibrary.figmaMirrorStatus,
      url: value.repositoryLibrary.figmaUrl
    },
    foundation: value.foundation,
    tokenSummary: {
      primitiveColors: Object.keys(value.primitives.color).length,
      semanticColors: Object.keys(value.semanticColor.light).length,
      metrics: metricCount,
      typographyStyles: Object.keys(value.typography.styles).length,
      effectStyles: value.figmaScope.effectStyles.length
    },
    typography: Object.entries(value.typography.styles).map(([name, style]) => ({ name, ...style })),
    effects: value.effects,
    components: Object.entries(value.components).map(([name, component]) => ({
      name,
      variantAxes: component.variants,
      variantCombinationCount: Object.values(component.variants)
        .reduce((total, options) => total * options.length, 1),
      accessibility: component.a11y
    })),
    statePatterns: value.statePatterns,
    accessibility: value.accessibility
  };
}

function renderCatalog(value) {
  const metricCount = ['spacing', 'radius', 'size', 'border', 'duration']
    .reduce((sum, group) => sum + Object.keys(value.primitives[group]).length, 0);
  const rows = Object.entries(value.components).map(([name, component]) => {
    const axes = Object.entries(component.variants)
      .map(([axis, options]) => `${axis}: ${options.join('، ')}`)
      .join('<br>');
    const count = Object.values(component.variants).reduce((total, options) => total * options.length, 1);
    return `| ${name} | ${axes} | ${count} | ${component.a11y.join('؛ ')} |`;
  });

  return `# EQCOFE — Repository Design-System Catalog\n\n` +
    `این فایل به‌صورت قطعی از \`${contractPath}\` تولید می‌شود و نباید دستی ویرایش شود. ` +
    `مخزن منبع Canonical است؛ Figma Starter فقط Mirror رایگان و غیرمسدودکننده است.\n\n` +
    `## خلاصه کتابخانه\n\n` +
    `| مورد | تعداد |\n|---|---:|\n` +
    `| رنگ Primitive | ${Object.keys(value.primitives.color).length} |\n` +
    `| نقش Semantic | ${Object.keys(value.semanticColor.light).length} |\n` +
    `| Token متریک | ${metricCount} |\n` +
    `| سبک تایپوگرافی | ${Object.keys(value.typography.styles).length} |\n` +
    `| خانواده Component | ${Object.keys(value.components).length} |\n` +
    `| خانواده State | ${Object.keys(value.statePatterns).length} |\n\n` +
    `## Component API\n\n` +
    `| Component | Variant axes | ترکیب‌های قراردادی | الزامات دسترس‌پذیری |\n|---|---|---:|---|\n` +
    `${rows.join('\n')}\n\n` +
    `## مرز استفاده\n\n` +
    `این Catalog قرارداد طراحی است، نه پیاده‌سازی Frontend. Wireframe، Prototype و Runtime Component در Stepهای بعدی ساخته می‌شوند.\n`;
}

function cssName(name) {
  return `--eq-${name.replace(/[\s/.]+/g, '-').toLowerCase()}`;
}

function quoteFontStack(primary, fallbacks) {
  return [`"${primary}"`, ...fallbacks.map((name) => name === 'sans-serif' ? name : `"${name}"`)].join(', ');
}
