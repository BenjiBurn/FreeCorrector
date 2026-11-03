# Builds the Microsoft Store package of FreeCorrector for Windows:
#   dist/freecorrector-<version>-windows-x64.msix
# The engines (build.js web), the app published with its own .NET runtime,
# the images and the manifest of windows/msix, packed by makeappx (from the
# Microsoft.Windows.SDK.BuildTools NuGet package). The Store signs it.
#   windows/package.ps1 [-Node <path to node.exe>]
param([string]$Node = 'node')
$ErrorActionPreference = 'Stop'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$root = Split-Path $PSScriptRoot
$dotnet = (Get-Command dotnet -ErrorAction SilentlyContinue).Source
if (-not $dotnet) { $dotnet = "$env:ProgramFiles\dotnet\dotnet.exe" }
$project = Join-Path $PSScriptRoot 'app\FreeCorrector.csproj'
$msix = Join-Path $PSScriptRoot 'msix'

& $Node (Join-Path $root 'scripts\build.js') web
if ($LASTEXITCODE) { throw "build.js web: $LASTEXITCODE" }
& $Node (Join-Path $PSScriptRoot 'app\tools\settings-page.js')
if ($LASTEXITCODE) { throw "settings-page.js: $LASTEXITCODE" }

$version = ([xml](Get-Content $project)).Project.PropertyGroup.Version | Where-Object { $_ } | Select-Object -First 1
$identity = Get-Content (Join-Path $msix 'identity.json') -Raw | ConvertFrom-Json
if ($identity.name -like 'ToFill*' -or $identity.publisher -like '*ToFill*') {
  Write-Warning "identity.json n'est pas rempli : ce paquet ne passera pas sur le Store (essais locaux seulement)."
}

$layout = Join-Path $root 'dist\windows\layout'
Remove-Item -Recurse -Force $layout -ErrorAction SilentlyContinue
& $dotnet publish $project -c Release -r win-x64 --self-contained true -o $layout --nologo -v minimal
if ($LASTEXITCODE) { throw "dotnet publish: $LASTEXITCODE" }
# Debug symbols and API documentation: not for users.
Get-ChildItem $layout -Include *.pdb, Microsoft.Web.WebView2.*.xml -Recurse | Remove-Item

Copy-Item -Recurse (Join-Path $msix 'assets') (Join-Path $layout 'assets')
$manifest = (Get-Content (Join-Path $msix 'AppxManifest.xml') -Raw -Encoding UTF8).
  Replace('{IdentityName}', $identity.name).
  Replace('{Publisher}', $identity.publisher).
  Replace('{PublisherDisplayName}', $identity.publisherDisplayName).
  Replace('{Version}', "$version.0")
[IO.File]::WriteAllText((Join-Path $layout 'AppxManifest.xml'), $manifest, (New-Object Text.UTF8Encoding $false))

& $dotnet restore (Join-Path $msix 'sdk-tools.csproj') --nologo -v quiet
if ($LASTEXITCODE) { throw "restore sdk-tools: $LASTEXITCODE" }
$makeappx = Get-ChildItem "$env:USERPROFILE\.nuget\packages\microsoft.windows.sdk.buildtools" -Recurse -Filter makeappx.exe |
  Where-Object { $_.Directory.Name -eq 'x64' } | Sort-Object FullName -Descending | Select-Object -First 1
$out = Join-Path $root "dist\freecorrector-$version-windows-x64.msix"
& $makeappx.FullName pack /o /d $layout /p $out
if ($LASTEXITCODE) { throw "makeappx: $LASTEXITCODE" }
"msix      $out ($([math]::Round((Get-Item $out).Length / 1MB, 1)) Mo)"
