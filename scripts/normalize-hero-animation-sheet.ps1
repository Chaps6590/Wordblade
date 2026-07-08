param(
  [Parameter(Mandatory = $true)]
  [string]$Source,

  [Parameter(Mandatory = $true)]
  [string]$HeroSlug,

  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z0-9]+(-[a-z0-9]+)*$')]
  [string]$AnimationName,

  [int]$Frames = 6,
  [int]$FrameWidth = 362,
  [int]$FrameHeight = 512,
  [double]$SourceFrameWidth = 0,
  [int]$CropY = 110,
  [string]$HeroesDir = (Join-Path $PSScriptRoot '..\public\characters\heroes')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$targetDir = Join-Path $HeroesDir (Join-Path $HeroSlug 'animations')
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$sourceImage = [System.Drawing.Bitmap]::FromFile($sourcePath)
try {
  $sourceFrameWidthActual = if ($SourceFrameWidth -gt 0) { $SourceFrameWidth } else { $sourceImage.Width / $Frames }
  if ($sourceImage.Height -lt ($CropY + $FrameHeight)) {
    throw "Source height $($sourceImage.Height) is smaller than crop area $($CropY + $FrameHeight) px."
  }

  $sheet = New-Object System.Drawing.Bitmap ($FrameWidth * $Frames), $FrameHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $sheet.SetResolution(96, 96)
  $graphics = [System.Drawing.Graphics]::FromImage($sheet)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  for ($frame = 0; $frame -lt $Frames; $frame++) {
    $sourceRect = New-Object System.Drawing.RectangleF ([single]($frame * $sourceFrameWidthActual)), ([single]$CropY), ([single]$sourceFrameWidthActual), ([single]$FrameHeight)
    $targetRect = New-Object System.Drawing.RectangleF ([single]($frame * $FrameWidth)), 0, ([single]$FrameWidth), ([single]$FrameHeight)
    $graphics.DrawImage($sourceImage, $targetRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
  }

  $graphics.Dispose()
  $targetPath = Join-Path $targetDir "$AnimationName.png"
  $sheet.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $sheet.Dispose()
  Write-Output $targetPath
} finally {
  $sourceImage.Dispose()
}
