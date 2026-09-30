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

Write-Host 'Checking Graphify health...'
& node scripts/graphify/health.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Graph is stale or unhealthy. Refreshing before Codex starts...'
    & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'refresh-eqcofe-graph.ps1')
    if ($LASTEXITCODE -ne 0) {
        throw 'Graphify refresh failed before Codex startup.'
    }
}

$watchScript = Join-Path $PSScriptRoot 'start-graphify-watch.ps1'
if (-not (Test-Path $watchScript)) {
    throw "Graphify watch launcher is missing: $watchScript"
}

$watchProcess = $null
$codexExitCode = 1

try {
    Write-Host 'Starting Graphify Watch for this Codex session...'
    $watchProcess = Start-Process powershell -ArgumentList @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', $watchScript
    ) -WorkingDirectory $repo -WindowStyle Hidden -PassThru

    Start-Sleep -Seconds 1
    if ($watchProcess.HasExited) {
        throw "Graphify Watch exited during startup with code $($watchProcess.ExitCode)."
    }

    Write-Host "Graphify Watch PID: $($watchProcess.Id)"
    Write-Host 'Starting Codex...'
    & $codexExe
    $codexExitCode = $LASTEXITCODE
}
finally {
    if ($watchProcess -and -not $watchProcess.HasExited) {
        Write-Host "Stopping Graphify Watch PID $($watchProcess.Id)..."
        Stop-Process -Id $watchProcess.Id -Force -ErrorAction SilentlyContinue
        $watchProcess.WaitForExit(5000) | Out-Null
    }

    Write-Host 'Running final Graphify refresh and health check...'
    & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'refresh-eqcofe-graph.ps1')
    if ($LASTEXITCODE -ne 0) {
        Write-Warning 'Final Graphify refresh/health check failed. Run .codex/refresh-eqcofe-graph.ps1 manually before relying on graph freshness.'
    }
}

exit $codexExitCode
