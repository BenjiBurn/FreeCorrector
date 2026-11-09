# Builds the installer of FreeCorrector for Windows downloaded from the site
# (lapigeonnerie.fr/freecorrector/windows), for the PCs where the Microsoft
# Store is blocked:
#   dist/freecorrector-<version>-windows-x64-setup.exe
# The engines (build.js web), the app published with its own .NET runtime, and
# windows/setup/FreeCorrector.iss compiled by Inno Setup 6
# (winget install JRSoftware.InnoSetup). Not signed: the site page says what
# Windows shows then.
#   windows/setup.ps1 [-Node <path to node.exe>] [-Iscc <path to ISCC.exe>]
param([string]$Node = 'node', [string]$Iscc = '')
$ErrorActionPreference = 'Stop'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$root = Split-Path $PSScriptRoot
$dotnet = (Get-Command dotnet -ErrorAction SilentlyContinue).Source
if (-not $dotnet) { $dotnet = "$env:ProgramFiles\dotnet\dotnet.exe" }
if (-not $Iscc) {
  $Iscc = @("$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe", "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe", "$env:ProgramFiles\Inno Setup 6\ISCC.exe") |
    Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $Iscc) { throw 'Inno Setup 6 introuvable : winget install JRSoftware.InnoSetup' }
}
$project = Join-Path $PSScriptRoot 'app\FreeCorrector.csproj'

& $Node (Join-Path $root 'scripts\build.js') web
if ($LASTEXITCODE) { throw "build.js web: $LASTEXITCODE" }
& $Node (Join-Path $PSScriptRoot 'app\tools\settings-page.js')
if ($LASTEXITCODE) { throw "settings-page.js: $LASTEXITCODE" }

$version = ([xml](Get-Content $project)).Project.PropertyGroup.Version | Where-Object { $_ } | Select-Object -First 1
$layout = Join-Path $root 'dist\windows\setup-layout'
Remove-Item -Recurse -Force $layout -ErrorAction SilentlyContinue
& $dotnet publish $project -c Release -r win-x64 --self-contained true -o $layout --nologo -v minimal
if ($LASTEXITCODE) { throw "dotnet publish: $LASTEXITCODE" }
# Debug symbols and API documentation: not for users.
Get-ChildItem $layout -Include *.pdb, Microsoft.Web.WebView2.*.xml -Recurse | Remove-Item

$dist = Join-Path $root 'dist'
& $Iscc /Q "/DAppVersion=$version" "/DSourceDir=$layout" "/DOutputDir=$dist" (Join-Path $PSScriptRoot 'setup\FreeCorrector.iss')
if ($LASTEXITCODE) { throw "ISCC: $LASTEXITCODE" }
$out = Join-Path $dist "freecorrector-$version-windows-x64-setup.exe"
"setup     $out ($([math]::Round((Get-Item $out).Length / 1MB, 1)) Mo)"
"sha256    $((Get-FileHash $out -Algorithm SHA256).Hash.ToLower())"
