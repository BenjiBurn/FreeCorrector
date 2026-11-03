# Builds FreeCorrector for Windows into windows/app/bin/<Configuration>/:
# first the engines (node scripts/build.js web -> dist/web), then the app.
#   windows/build.ps1 [-Configuration Release] [-Node <path to node.exe>]
param([string]$Configuration = 'Debug', [string]$Node = 'node')
$ErrorActionPreference = 'Stop'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$root = Split-Path $PSScriptRoot
& $Node (Join-Path $root 'scripts\build.js') web
if ($LASTEXITCODE) { throw "build.js web: $LASTEXITCODE" }
$dotnet = (Get-Command dotnet -ErrorAction SilentlyContinue).Source
if (-not $dotnet) { $dotnet = "$env:ProgramFiles\dotnet\dotnet.exe" }
& $dotnet build (Join-Path $PSScriptRoot 'app\FreeCorrector.csproj') -c $Configuration --nologo -v minimal
if ($LASTEXITCODE) { throw "dotnet build: $LASTEXITCODE" }
