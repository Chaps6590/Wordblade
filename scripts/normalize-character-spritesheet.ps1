param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Destination,
  [int]$Frames = 6,
  [int]$Columns = 6,
  [int]$Rows = 1,
  [int]$FrameWidth = 512,
  [int]$FrameHeight = 512,
  [int]$Padding = 20,
  [int]$GroundMargin = 24,
  [int]$AlphaThreshold = 10,
  [switch]$AutoDetectFrames
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if ($Frames -lt 1 -or $Columns -lt 1 -or $Rows -lt 1) { throw 'Frames, Columns and Rows must be positive.' }
if ($Frames -gt ($Columns * $Rows)) { throw 'The grid has fewer cells than requested frames.' }

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$destinationPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Destination))
$sourceImage = [System.Drawing.Bitmap]::FromFile($sourcePath)
$cells = @()

function Get-FrameColumns([System.Drawing.Bitmap]$Image, [int]$Threshold) {
  $runs = @()
  $start = -1
  for ($x = 0; $x -lt $Image.Width; $x++) {
    $occupied = $false
    for ($y = 0; $y -lt $Image.Height; $y++) {
      if ($Image.GetPixel($x, $y).A -gt $Threshold) { $occupied = $true; break }
    }
    if ($occupied -and $start -lt 0) { $start = $x }
    if (-not $occupied -and $start -ge 0) {
      $runs += [System.Drawing.Rectangle]::new($start, 0, ($x - $start), $Image.Height)
      $start = -1
    }
  }
  if ($start -ge 0) { $runs += [System.Drawing.Rectangle]::new($start, 0, ($Image.Width - $start), $Image.Height) }
  return $runs
}

function Get-OpaqueBounds([System.Drawing.Bitmap]$Image, [System.Drawing.Rectangle]$Cell, [int]$Threshold) {
  $minX = $Cell.Width
  $minY = $Cell.Height
  $maxX = -1
  $maxY = -1
  for ($y = 0; $y -lt $Cell.Height; $y++) {
    for ($x = 0; $x -lt $Cell.Width; $x++) {
      if ($Image.GetPixel($Cell.X + $x, $Cell.Y + $y).A -le $Threshold) { continue }
      if ($x -lt $minX) { $minX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
  if ($maxX -lt 0) { return $null }
  return [System.Drawing.Rectangle]::new($minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1))
}

try {
  $commonScale = [double]::PositiveInfinity
  $detectedCells = if ($AutoDetectFrames) { @(Get-FrameColumns $sourceImage $AlphaThreshold) } else { @() }
  if ($AutoDetectFrames -and $detectedCells.Count -ne $Frames) {
    throw "Auto detection found $($detectedCells.Count) horizontal figures; expected $Frames. Use an explicit grid or clean the source image."
  }
  for ($index = 0; $index -lt $Frames; $index++) {
    if ($AutoDetectFrames) {
      $cell = $detectedCells[$index]
    } else {
      $column = $index % $Columns
      $row = [Math]::Floor($index / $Columns)
      $left = [int][Math]::Round(($column * $sourceImage.Width) / $Columns)
      $right = [int][Math]::Round((($column + 1) * $sourceImage.Width) / $Columns)
      $top = [int][Math]::Round(($row * $sourceImage.Height) / $Rows)
      $bottom = [int][Math]::Round((($row + 1) * $sourceImage.Height) / $Rows)
      $cell = [System.Drawing.Rectangle]::new($left, $top, ($right - $left), ($bottom - $top))
    }
    $bounds = Get-OpaqueBounds $sourceImage $cell $AlphaThreshold
    if ($null -eq $bounds) { throw "Frame $($index + 1) is empty." }
    $scale = [Math]::Min(($FrameWidth - (2 * $Padding)) / $bounds.Width, ($FrameHeight - $GroundMargin - $Padding) / $bounds.Height)
    $commonScale = [Math]::Min($commonScale, $scale)
    $cells += [PSCustomObject]@{ Cell = $cell; Bounds = $bounds }
  }

  $sheet = [System.Drawing.Bitmap]::new($FrameWidth * $Frames, $FrameHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($sheet)
  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    for ($index = 0; $index -lt $Frames; $index++) {
      $entry = $cells[$index]
      $sourceRect = [System.Drawing.Rectangle]::new(
        $entry.Cell.X + $entry.Bounds.X,
        $entry.Cell.Y + $entry.Bounds.Y,
        $entry.Bounds.Width,
        $entry.Bounds.Height
      )
      $width = [int][Math]::Round($entry.Bounds.Width * $commonScale)
      $height = [int][Math]::Round($entry.Bounds.Height * $commonScale)
      $targetRect = [System.Drawing.Rectangle]::new(
        ($index * $FrameWidth) + [int][Math]::Round(($FrameWidth - $width) / 2),
        $FrameHeight - $GroundMargin - $height,
        $width,
        $height
      )
      $graphics.DrawImage($sourceImage, $targetRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
    }
  } finally {
    $graphics.Dispose()
  }

  [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($destinationPath)) | Out-Null
  $sheet.Save($destinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $sheet.Dispose()
  [PSCustomObject]@{
    Destination = $destinationPath
    Size = "$($FrameWidth * $Frames)x$FrameHeight"
    Frames = $Frames
    Grid = if ($AutoDetectFrames) { 'auto-horizontal' } else { "${Columns}x${Rows}" }
    CommonScale = [Math]::Round($commonScale, 4)
  } | Format-List
} finally {
  $sourceImage.Dispose()
}
