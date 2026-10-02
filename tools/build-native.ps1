$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $PSScriptRoot
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { throw 'Windows .NET Framework C# compiler is required to build MoroMotion.' }
$motionSource = Join-Path $appRoot 'native\MoroMotion.cs'
$motionOutput = Join-Path $appRoot 'native\MoroMotion.exe'
& $compiler /nologo /optimize+ /platform:x64 /target:exe "/out:$motionOutput" $motionSource
if ($LASTEXITCODE -ne 0) { throw 'MoroMotion compilation failed.' }
