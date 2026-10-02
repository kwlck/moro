param([string]$CompilerPath)
$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $PSScriptRoot
if (-not $CompilerPath) {
    $command = Get-Command ISCC.exe -ErrorAction SilentlyContinue
    if ($command) { $CompilerPath = $command.Source }
    else {
        $candidates = @(
            (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'),
            (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 7\ISCC.exe'),
            (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe'),
            (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 7\ISCC.exe')
        )
        $CompilerPath = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    }
}
if (-not $CompilerPath -or -not (Test-Path -LiteralPath $CompilerPath)) {
    throw 'Install Inno Setup 6.7 or newer, or pass -CompilerPath with the path to ISCC.exe.'
}
if (-not (Test-Path -LiteralPath (Join-Path $appRoot 'dist\Moro-win32-x64\Moro.exe'))) {
    throw 'Run npm run package before building the installer.'
}
$version = (Get-Content -Raw -LiteralPath (Join-Path $appRoot 'package.json') | ConvertFrom-Json).version
& $CompilerPath "/DAppVersion=$version" (Join-Path $appRoot 'installer\Moro.iss')
if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed.' }
