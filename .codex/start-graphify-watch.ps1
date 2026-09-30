$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$rootFile = '.\graphify-out\.graphify_root'
$pythonFile = '.\graphify-out\.graphify_python'

if (-not (Test-Path '.\graphify-out\graph.json')) {
    throw 'Canonical graph is missing. Build it before starting watch mode.'
}

$scanRoot = if (Test-Path $rootFile) { (Get-Content $rootFile -Raw).Trim() } else { $repo }

if (Test-Path $pythonFile) {
    $python = (Get-Content $pythonFile -Raw).Trim()
    if (-not (Test-Path $python)) { throw "Recorded Graphify Python does not exist: $python" }
    & $python -m graphify.watch $scanRoot --debounce 3
} else {
    $uv = Get-Command uv -ErrorAction SilentlyContinue
    if (-not $uv) { throw 'Graphify interpreter metadata is missing and uv is unavailable.' }
    & $uv.Source tool run --from graphifyy python -m graphify.watch $scanRoot --debounce 3
}
exit $LASTEXITCODE
