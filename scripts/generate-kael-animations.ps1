param(
  [string]$Source = "public/characters/heroes/kael-guardaluna.png",
  [string]$OutDir = "public/characters/heroes/animations"
)

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$sourcePath = Resolve-Path -LiteralPath $Source
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$src = [System.Drawing.Bitmap]::FromFile($sourcePath)
$frameW = $src.Width
$frameH = $src.Height

function New-TransparentBitmap($width, $height) {
  $bitmap = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bitmap.SetResolution(96, 96)
  return $bitmap
}

function Draw-HeroFrame($target, $source, $x, $y, $scaleX, $scaleY, $angle, $breath, $glint, $slash) {
  $g = [System.Drawing.Graphics]::FromImage($target)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver

  $pivotX = $source.Width * 0.5
  $pivotY = $source.Height * 0.88
  $g.TranslateTransform($pivotX + $x, $pivotY + $y)
  $g.RotateTransform($angle)
  $g.ScaleTransform($scaleX, $scaleY)
  $g.TranslateTransform(-$pivotX, -$pivotY)
  $g.DrawImage($source, 0, 0, $source.Width, $source.Height)
  $g.ResetTransform()

  if ($breath -gt 0) {
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb([int](28 * $breath), 118, 188, 255))
    $g.FillEllipse($brush, 435, 520, 190, 105)
    $brush.Dispose()
  }

  if ($glint -gt 0) {
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb([int](150 * $glint), 235, 250, 255)), 9
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, 164, 644, 386, 392)
    $pen.Dispose()
  }

  if ($slash -gt 0) {
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb([int](185 * $slash), 209, 236, 255)), 18
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawBezier($pen, 86, 760, 210, 528, 396, 354, 604, 258)
    $pen.Dispose()

    $core = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb([int](210 * $slash), 255, 255, 255)), 6
    $core.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $core.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawBezier($core, 104, 746, 236, 532, 414, 372, 594, 282)
    $core.Dispose()
  }

  $g.Dispose()
}

function Save-Sheet($name, $frames) {
  $sheet = New-TransparentBitmap ($script:frameW * $frames.Count) $script:frameH
  $g = [System.Drawing.Graphics]::FromImage($sheet)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver

  for ($i = 0; $i -lt $frames.Count; $i++) {
    $frame = New-TransparentBitmap $script:frameW $script:frameH
    Draw-HeroFrame $frame $script:src $frames[$i].x $frames[$i].y $frames[$i].scaleX $frames[$i].scaleY $frames[$i].angle $frames[$i].breath $frames[$i].glint $frames[$i].slash
    $g.DrawImage($frame, $i * $script:frameW, 0, $script:frameW, $script:frameH)
    $frame.Dispose()
  }

  $outPath = Join-Path $OutDir $name
  $sheet.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $sheet.Dispose()
  Write-Output $outPath
}

$idleFrames = @(
  @{ x = 0;  y = 0;  scaleX = 1.000; scaleY = 1.000; angle = -0.3; breath = 0.20; glint = 0.00; slash = 0.00 },
  @{ x = 1;  y = -5; scaleX = 1.010; scaleY = 0.992; angle = 0.2;  breath = 0.75; glint = 0.35; slash = 0.00 },
  @{ x = 0;  y = -8; scaleX = 1.018; scaleY = 0.986; angle = 0.8;  breath = 1.00; glint = 0.85; slash = 0.00 },
  @{ x = -1; y = -4; scaleX = 1.008; scaleY = 0.994; angle = 0.2;  breath = 0.55; glint = 0.20; slash = 0.00 }
)

$attackFrames = @(
  @{ x = -5; y = 0;   scaleX = 0.996; scaleY = 1.002; angle = -4.5; breath = 0.40; glint = 0.35; slash = 0.00 },
  @{ x = 30; y = -12; scaleX = 1.035; scaleY = 0.990; angle = 5.0;  breath = 0.85; glint = 1.00; slash = 0.25 },
  @{ x = 54; y = -8;  scaleX = 1.055; scaleY = 0.978; angle = 9.0;  breath = 0.95; glint = 1.00; slash = 1.00 },
  @{ x = 18; y = -3;  scaleX = 1.018; scaleY = 0.994; angle = 2.0;  breath = 0.60; glint = 0.45; slash = 0.20 }
)

Save-Sheet "kael-idle-sheet.png" $idleFrames
Save-Sheet "kael-attack-sheet.png" $attackFrames

$src.Dispose()
