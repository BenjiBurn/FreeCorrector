# Publishes the installer built by windows/setup.ps1 for the download page
# lapigeonnerie.fr/freecorrector/windows:
#   windows/deploy-site.ps1 C:/wamp64/www/lapigeonnerie
# 1. a GitHub release of the repository, tag windows-v<version> on the current
#    commit, with the installer, its SHA-256 and the version notes of
#    windows/NOTES-VERSION.md (gh, the GitHub CLI, logged in: gh auth login);
# 2. <site>/downloads/freecorrector/latest.json: version, size, SHA-256 and the
#    file's address on GitHub. The page's button counts the download, then sends
#    the browser there; the app's daily update check (Updates.cs) finds this version.
# The file lives on GitHub, not on the site's server: a compromised server
# could not swap it, and the site's connection does not send it.
param([Parameter(Mandatory = $true)][string]$Site, [string]$Gh = '')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
if (-not $Gh) {
  $Gh = (Get-Command gh -ErrorAction SilentlyContinue).Source
  if (-not $Gh) { $Gh = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter gh.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName }
  if (-not $Gh) { throw 'gh introuvable : winget install GitHub.cli, puis gh auth login' }
}
$repo = 'BenjiBurn/FreeCorrector'
$project = Join-Path $PSScriptRoot 'app\FreeCorrector.csproj'
$version = ([xml](Get-Content $project)).Project.PropertyGroup.Version | Where-Object { $_ } | Select-Object -First 1
$name = "freecorrector-$version-windows-x64-setup.exe"
$file = Join-Path $root "dist\$name"
if (-not (Test-Path $file)) { throw "$name introuvable : lancer d'abord windows/setup.ps1" }
if (-not (Test-Path (Join-Path $Site 'freecorrector-windows.php'))) { throw "$Site n'est pas le dossier du site" }
$sha = (Get-FileHash $file -Algorithm SHA256).Hash.ToLower()
$tag = "windows-v$version"

# "release not found" on stderr: Windows PowerShell would stop on it.
$ErrorActionPreference = 'Continue'
& $Gh release view $tag --repo $repo --json tagName 2>$null | Out-Null
$found = $LASTEXITCODE -eq 0
$ErrorActionPreference = 'Stop'
if (-not $found) {
  # The release built from what is committed: no local changes in the app.
  if (git -C $root status --porcelain -- windows) { throw 'windows/ a des modifications non commitées : commiter, puis relancer setup.ps1' }
  $notes = Get-Content (Join-Path $PSScriptRoot 'NOTES-VERSION.md') -Raw -Encoding UTF8
  $section = [regex]::Match($notes, '(?ms)^## ' + [regex]::Escape($version) + '\s*$(.*?)(?=^## |\z)').Groups[1].Value
  $blocks = [regex]::Matches($section, '(?ms)```text\r?\n(.*?)\r?\n```') | ForEach-Object { $_.Groups[1].Value.Trim() }
  if ($blocks.Count -lt 2) { throw "NOTES-VERSION.md : pas de notes FR et EN pour $version" }
  $body = @"
**Français** — pour les PC où le Microsoft Store est bloqué. Page de téléchargement et aide : https://lapigeonnerie.fr/freecorrector/windows

$($blocks[0])

**English** — for PCs where the Microsoft Store is blocked. Download page and help: https://lapigeonnerie.fr/freecorrector/en/windows

$($blocks[1])

SHA-256 ``$name``:
``````
$sha
``````
"@
  $notesFile = Join-Path $env:TEMP "fc-release-$version.md"
  [IO.File]::WriteAllText($notesFile, $body, (New-Object Text.UTF8Encoding $false))
  & $Gh release create $tag $file --repo $repo --target (git -C $root rev-parse HEAD) --title "FreeCorrector pour Windows $version" --notes-file $notesFile --latest=false
  if ($LASTEXITCODE) { throw "gh release create: $LASTEXITCODE" }
  Remove-Item $notesFile
  "release   https://github.com/$repo/releases/tag/$tag"
} else {
  # Already published: the installer there must be this very file.
  $assets = & $Gh release view $tag --repo $repo --json assets | ConvertFrom-Json
  $asset = $assets.assets | Where-Object name -eq $name
  if (-not $asset) {
    & $Gh release upload $tag $file --repo $repo
    if ($LASTEXITCODE) { throw "gh release upload: $LASTEXITCODE" }
  } elseif ($asset.digest -and $asset.digest -ne "sha256:$sha") {
    throw "La release $tag a déjà un $name différent de dist/ ($($asset.digest))"
  }
  "release   https://github.com/$repo/releases/tag/$tag (déjà là)"
}

$target = Join-Path $Site 'downloads\freecorrector'
New-Item -ItemType Directory -Force $target | Out-Null
$latest = [ordered]@{
  version = $version
  name    = $name
  size    = (Get-Item $file).Length
  sha256  = $sha
  url     = "https://github.com/$repo/releases/download/$tag/$name"
  release = "https://github.com/$repo/releases/tag/$tag"
}
[IO.File]::WriteAllText((Join-Path $target 'latest.json'), ($latest | ConvertTo-Json), (New-Object Text.UTF8Encoding $false))
# The installers once served by the site itself.
Get-ChildItem $target -Filter 'freecorrector-*-windows-x64-setup.exe*' | ForEach-Object { Remove-Item $_.FullName; "removed   $($_.Name)" }
"latest    $version -> $($latest.url)"
"sha256    $sha"
