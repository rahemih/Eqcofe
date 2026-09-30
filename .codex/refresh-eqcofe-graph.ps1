$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

if (-not (Test-Path '.\graphify-out\graph.json')) {
    throw 'Canonical graph is missing. Build the repository-wide graph from the repository root with Graphify before using incremental refresh.'
}

$graphify = Get-Command graphify -ErrorAction SilentlyContinue
if ($graphify) {
    & $graphify.Source '.' '--update' '--code-only'
} else {
    $uv = Get-Command uv -ErrorAction SilentlyContinue
    if (-not $uv) { throw 'Neither graphify nor uv is available on PATH.' }
    & $uv.Source tool run --from graphifyy graphify . --update --code-only
}
if ($LASTEXITCODE -ne 0) { throw "Graphify update failed with exit code $LASTEXITCODE" }

node scripts/graphify/record-state.mjs
if ($LASTEXITCODE -ne 0) { throw 'Failed to record Graphify state.' }

node scripts/graphify/health.mjs
if ($LASTEXITCODE -ne 0) { throw 'Graph health is not FRESH/PASS after refresh.' }
