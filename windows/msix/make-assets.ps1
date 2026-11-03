# Draws the package images (windows/msix/assets/*.png) from src/icons/icon.svg
# with headless Edge, at the sizes the MSIX manifest names. Run again only when
# the icon changes; the images are kept in the repository.
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot)
$svg = [IO.File]::ReadAllText((Join-Path $root 'src\icons\icon.svg'))
$out = Join-Path $PSScriptRoot 'assets'
New-Item -ItemType Directory -Force $out | Out-Null
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$work = Join-Path $env:TEMP "fc-msix-assets-$PID"
New-Item -ItemType Directory -Force $work | Out-Null
# name, width, height, icon size
$images = @(
  @('StoreLogo', 50, 50, 50),
  @('Square44x44Logo', 44, 44, 44),
  @('Square150x150Logo', 150, 150, 100),
  @('Wide310x150Logo', 310, 150, 100)
)
try {
  foreach ($img in $images) {
    $name, $w, $h, $s = $img
    $page = Join-Path $work "$name.html"
    Set-Content -Encoding UTF8 $page "<!doctype html><html><body style='margin:0;width:${w}px;height:${h}px;display:grid;place-items:center;background:transparent'><div style='width:${s}px;height:${s}px'>$($svg -replace '<svg ', "<svg width='$s' height='$s' ")</div></body></html>"
    $png = Join-Path $out "$name.png"
    # Edge writes harmless messages on stderr: not through PowerShell's error stream.
    Start-Process $edge -Wait -WindowStyle Hidden -ArgumentList @('--headless=new', '--disable-gpu', '--hide-scrollbars',
      "--user-data-dir=`"$work\profile`"", '--default-background-color=00000000',
      "--window-size=$w,$h", "--screenshot=`"$png`"", ([Uri]$page).AbsoluteUri)
    for ($i = 0; $i -lt 50 -and -not (Test-Path $png); $i++) { Start-Sleep -Milliseconds 200 }
    "$name.png ${w}x${h}"
  }
} finally {
  Start-Sleep -Milliseconds 500
  Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
}
