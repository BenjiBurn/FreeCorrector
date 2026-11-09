# Puts the installer built by windows/setup.ps1 on the website, for the
# download page lapigeonnerie.fr/freecorrector/windows:
#   windows/deploy-site.ps1 C:/wamp64/www/lapigeonnerie
# Copies dist/freecorrector-<version>-windows-x64-setup.exe into
# <site>/downloads/freecorrector/ with its SHA-256 next to it, and removes the
# older versions. The page offers the newest file of the folder, and the app's
# daily update check (Updates.cs) then finds this version.
param([Parameter(Mandatory = $true)][string]$Site)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$project = Join-Path $PSScriptRoot 'app\FreeCorrector.csproj'
$version = ([xml](Get-Content $project)).Project.PropertyGroup.Version | Where-Object { $_ } | Select-Object -First 1
$name = "freecorrector-$version-windows-x64-setup.exe"
$file = Join-Path $root "dist\$name"
if (-not (Test-Path $file)) { throw "$name introuvable : lancer d'abord windows/setup.ps1" }
$target = Join-Path $Site 'downloads\freecorrector'
if (-not (Test-Path (Join-Path $Site 'freecorrector-windows.php'))) { throw "$Site n'est pas le dossier du site" }
New-Item -ItemType Directory -Force $target | Out-Null

Copy-Item $file $target -Force
$sha = (Get-FileHash $file -Algorithm SHA256).Hash.ToLower()
[IO.File]::WriteAllText((Join-Path $target "$name.sha256"), $sha)
Get-ChildItem $target -Filter 'freecorrector-*-windows-x64-setup.exe*' |
  Where-Object { $_.Name -ne $name -and $_.Name -ne "$name.sha256" } |
  ForEach-Object { Remove-Item $_.FullName; "removed   $($_.Name)" }
"deployed  $name ($([math]::Round((Get-Item $file).Length / 1MB, 1)) Mo)"
"sha256    $sha"
