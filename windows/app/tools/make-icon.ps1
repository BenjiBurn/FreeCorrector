# Draws windows/app/icon.ico (the program's icon: the .exe, the Start menu
# shortcut, the installer) from src/icons/icon.svg with headless Edge, one PNG
# per size packed into the .ico. Run again only when the icon changes; the
# .ico is kept in the repository.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path (Split-Path (Split-Path $PSScriptRoot))
$svg = [IO.File]::ReadAllText((Join-Path $root 'src\icons\icon.svg'))
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$work = Join-Path $env:TEMP "fc-icon-$PID"
New-Item -ItemType Directory -Force $work | Out-Null
$sizes = 16, 20, 24, 32, 40, 48, 64, 256
try {
  $images = foreach ($s in $sizes) {
    $page = Join-Path $work "$s.html"
    Set-Content -Encoding UTF8 $page "<!doctype html><html><body style='margin:0;width:${s}px;height:${s}px;background:transparent'>$($svg -replace '<svg ', "<svg width='$s' height='$s' style='display:block' ")</body></html>"
    $png = Join-Path $work "$s.png"
    # Edge writes harmless messages on stderr: not through PowerShell's error stream.
    Start-Process $edge -Wait -WindowStyle Hidden -ArgumentList @('--headless=new', '--disable-gpu', '--hide-scrollbars',
      "--user-data-dir=`"$work\profile`"", '--default-background-color=00000000',
      "--window-size=$s,$s", "--screenshot=`"$png`"", ([Uri]$page).AbsoluteUri)
    for ($i = 0; $i -lt 50 -and -not (Test-Path $png); $i++) { Start-Sleep -Milliseconds 200 }
    Start-Sleep -Milliseconds 200
    # 256 stays a PNG; the small sizes become the classic 32-bit bitmaps,
    # which every reader of .ico files understands.
    if ($s -ge 256) { , [IO.File]::ReadAllBytes($png); continue }
    $bitmap = New-Object Drawing.Bitmap $png
    $dib = New-Object IO.MemoryStream
    $d = New-Object IO.BinaryWriter $dib
    # BITMAPINFOHEADER: the height counts the colour rows and the mask rows.
    $d.Write([uint32]40); $d.Write([int32]$s); $d.Write([int32](2 * $s))
    $d.Write([uint16]1); $d.Write([uint16]32); $d.Write([uint32]0)
    $d.Write([uint32]0); $d.Write([int32]0); $d.Write([int32]0); $d.Write([uint32]0); $d.Write([uint32]0)
    for ($y = $s - 1; $y -ge 0; $y--) {
      for ($x = 0; $x -lt $s; $x++) {
        $c = $bitmap.GetPixel($x, $y)
        $d.Write([byte]$c.B); $d.Write([byte]$c.G); $d.Write([byte]$c.R); $d.Write([byte]$c.A)
      }
    }
    # The AND mask, unused with an alpha channel: zeros, rows padded to 4 bytes.
    $d.Write((New-Object byte[] ([math]::Ceiling($s / 32) * 4 * $s)))
    $bitmap.Dispose()
    , $dib.ToArray()
  }
  # ICO: a header, one 16-byte entry per image, then the PNG files themselves.
  $out = New-Object IO.MemoryStream
  $w = New-Object IO.BinaryWriter $out
  $w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]$sizes.Count)
  $offset = 6 + 16 * $sizes.Count
  for ($i = 0; $i -lt $sizes.Count; $i++) {
    $s = $sizes[$i]
    $w.Write([byte]($s % 256)); $w.Write([byte]($s % 256))  # 256 is written 0
    $w.Write([byte]0); $w.Write([byte]0)
    $w.Write([uint16]1); $w.Write([uint16]32)
    $w.Write([uint32]$images[$i].Length); $w.Write([uint32]$offset)
    $offset += $images[$i].Length
  }
  foreach ($bytes in $images) { $w.Write($bytes) }
  $ico = Join-Path (Split-Path $PSScriptRoot) 'icon.ico'
  [IO.File]::WriteAllBytes($ico, $out.ToArray())
  "icon.ico $($sizes -join ', ') ($([math]::Round($out.Length / 1KB)) Ko)"
} finally {
  Start-Sleep -Milliseconds 500
  Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
}
