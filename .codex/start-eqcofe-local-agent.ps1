$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$branch = (git branch --show-current).Trim()
if (-not $branch) {
    throw 'Unable to determine the current Git branch.'
}
if ($branch -eq 'main') {
    throw 'Refusing to start the EQCOFE local agent on main. Switch to a task branch first.'
}

$codexCommand = Get-Command codex -ErrorAction SilentlyContinue
$codexExe = if ($codexCommand) { $codexCommand.Source } else { $null }

if (-not $codexExe) {
    $candidate = Join-Path $env:LOCALAPPDATA 'Programs\OpenAI\Codex\bin\codex.exe'
    if (Test-Path $candidate) {
        $codexExe = $candidate
    }
}

if (-not $codexExe) {
    throw 'Codex CLI was not found. Install or repair Codex before starting the local agent.'
}

Write-Host "EQCOFE local agent"
Write-Host "Repository: $repo"
Write-Host "Branch: $branch"
Write-Host "Codex: $codexExe"
Write-Host 'Repository AGENTS.md and Graphify instructions will be loaded by Codex.'

& $codexExe
exit $LASTEXITCODE
