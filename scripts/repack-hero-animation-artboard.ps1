param(
  [Parameter(Mandatory = $true)]
  [string]$Source,

  [string]$Destination = '',
  [int]$Frames = 6,
  [int]$TargetFrameWidth = 512,
  [int]$TargetFrameHeight = 512,
  [int]$MaxContentWidth = 0,
  [int]$MaxContentHeight = 0,
  [int]$GroundMargin = 26,
  [int]$AlphaThreshold = 10
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$destinationPath = if ($Destination) {
  if (Test-Path -LiteralPath $Destination) {
    (Resolve-Path -LiteralPath $Destination).Path
  } else {
    $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Destination)
  }
} else {
  $sourcePath
}
$savePath = if ([System.String]::Equals($sourcePath, $destinationPath, [System.StringComparison]::OrdinalIgnoreCase)) {
  "$destinationPath.tmp"
} else {
  $destinationPath
}
$sourceImage = [System.Drawing.Bitmap]::FromFile($sourcePath)

function Get-OpaqueBounds($bitmap, $frameIndex, $frameWidth, $frameHeight, $threshold) {
  $minX = $frameWidth
  $minY = $frameHeight
  $maxX = -1
  $maxY = -1
  $sourceX = $frameIndex * $frameWidth

  for ($y = 0; $y -lt $frameHeight; $y++) {
    for ($x = 0; $x -lt $frameWidth; $x++) {
      if ($bitmap.GetPixel($sourceX + $x, $y).A -gt $threshold) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($maxX -lt 0) {
    return [System.Drawing.Rectangle]::new(0, 0, $frameWidth, $frameHeight)
  }

  return [System.Drawing.Rectangle]::new($minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1))
}

try {
  $sourceFrameWidth = [int]($sourceImage.Width / $Frames)
  $sourceFrameHeight = $sourceImage.Height
  $targetSheet = [System.Drawing.Bitmap]::new($TargetFrameWidth * $Frames, $TargetFrameHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $targetSheet.SetResolution(96, 96)

  $graphics = [System.Drawing.Graphics]::FromImage($targetSheet)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  for ($frame = 0; $frame -lt $Frames; $frame++) {
    $bounds = Get-OpaqueBounds $sourceImage $frame $sourceFrameWidth $sourceFrameHeight $AlphaThreshold
    $scale = 1.0
    if ($MaxContentWidth -gt 0 -and $bounds.Width -gt $MaxContentWidth) {
      $scale = [Math]::Min($scale, $MaxContentWidth / $bounds.Width)
    }
    if ($MaxContentHeight -gt 0 -and $bounds.Height -gt $MaxContentHeight) {
      $scale = [Math]::Min($scale, $MaxContentHeight / $bounds.Height)
    }

    $targetWidth = [int][Math]::Round($bounds.Width * $scale)
    $targetHeight = [int][Math]::Round($bounds.Height * $scale)
    $targetX = ($frame * $TargetFrameWidth) + [int](($TargetFrameWidth - $targetWidth) / 2)
    $targetY = [int]($TargetFrameHeight - $GroundMargin - $targetHeight)
    if ($targetY -lt 0) { $targetY = 0 }

    $sourceRect = [System.Drawing.Rectangle]::new(($frame * $sourceFrameWidth) + $bounds.X, $bounds.Y, $bounds.Width, $bounds.Height)
    $targetRect = [System.Drawing.Rectangle]::new($targetX, $targetY, $targetWidth, $targetHeight)
    $graphics.DrawImage($sourceImage, $targetRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
  }

  $graphics.Dispose()
  $targetSheet.Save($savePath, [System.Drawing.Imaging.ImageFormat]::Png)
  $targetSheet.Dispose()
} finally {
  $sourceImage.Dispose()
}

if (-not [System.String]::Equals($savePath, $destinationPath, [System.StringComparison]::OrdinalIgnoreCase)) {
  Move-Item -LiteralPath $savePath -Destination $destinationPath -Force
}

Write-Output $destinationPath
