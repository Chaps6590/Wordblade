param(
  [Parameter(Mandatory = $true)]
  [string]$Source,

  [Parameter(Mandatory = $true)]
  [string]$Destination,

  [int]$Frames = 6,
  [int]$TargetFrameWidth = 512,
  [int]$TargetFrameHeight = 512,
  [int]$GroundMargin = 26,
  [int]$AlphaThreshold = 10,
  [int]$MinComponentArea = 80,
  [int]$CropPadding = 6,
  [double]$CarryoverRatio = 0.33,
  [switch]$KeepLargestOnly
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not ('SpriteComponentScanner' -as [type])) {
  Add-Type -ReferencedAssemblies 'System.Runtime', 'System.Collections', 'System.Drawing.Common', 'System.Drawing.Primitives', 'System.Private.Windows.GdiPlus', 'System.Private.Windows.Core' -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public struct SpriteComponent {
  public int X;
  public int Y;
  public int Width;
  public int Height;
  public int Area;
  public int CenterX { get { return X + (Width / 2); } }
}

public static class SpriteComponentScanner {
  public static SpriteComponent[] Find(string path, int alphaThreshold) {
    using (Bitmap bitmap = new Bitmap(path)) {
      int width = bitmap.Width;
      int height = bitmap.Height;
      Rectangle rect = new Rectangle(0, 0, width, height);
      BitmapData data = bitmap.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      int stride = Math.Abs(data.Stride);
      byte[] bytes = new byte[stride * height];
      Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
      bitmap.UnlockBits(data);

      bool[] visited = new bool[width * height];
      int[] queue = new int[width * height];
      List<SpriteComponent> components = new List<SpriteComponent>();

      for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
          int index = y * width + x;
          if (visited[index] || AlphaAt(bytes, stride, x, y) <= alphaThreshold) {
            visited[index] = true;
            continue;
          }

          int head = 0;
          int tail = 0;
          queue[tail++] = index;
          visited[index] = true;
          int minX = x;
          int minY = y;
          int maxX = x;
          int maxY = y;
          int area = 0;

          while (head < tail) {
            int current = queue[head++];
            int cx = current % width;
            int cy = current / width;
            area++;
            if (cx < minX) minX = cx;
            if (cy < minY) minY = cy;
            if (cx > maxX) maxX = cx;
            if (cy > maxY) maxY = cy;

            for (int oy = -1; oy <= 1; oy++) {
              for (int ox = -1; ox <= 1; ox++) {
                if (ox == 0 && oy == 0) continue;
                int nx = cx + ox;
                int ny = cy + oy;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                int ni = ny * width + nx;
                if (visited[ni]) continue;
                visited[ni] = true;
                if (AlphaAt(bytes, stride, nx, ny) > alphaThreshold) {
                  queue[tail++] = ni;
                }
              }
            }
          }

          components.Add(new SpriteComponent {
            X = minX,
            Y = minY,
            Width = maxX - minX + 1,
            Height = maxY - minY + 1,
            Area = area
          });
        }
      }

      return components.ToArray();
    }
  }

  private static byte AlphaAt(byte[] bytes, int stride, int x, int y) {
    return bytes[(y * stride) + (x * 4) + 3];
  }
}
'@
}

function Expand-Rect($rect, $padding, $maxWidth, $maxHeight) {
  $x = [Math]::Max(0, $rect.X - $padding)
  $y = [Math]::Max(0, $rect.Y - $padding)
  $right = [Math]::Min($maxWidth, $rect.X + $rect.Width + $padding)
  $bottom = [Math]::Min($maxHeight, $rect.Y + $rect.Height + $padding)
  return [System.Drawing.Rectangle]::new($x, $y, $right - $x, $bottom - $y)
}

function Union-Rect($a, $b) {
  if ($null -eq $a) { return $b }
  $x = [Math]::Min($a.X, $b.X)
  $y = [Math]::Min($a.Y, $b.Y)
  $right = [Math]::Max($a.X + $a.Width, $b.X + $b.Width)
  $bottom = [Math]::Max($a.Y + $a.Height, $b.Y + $b.Height)
  return [System.Drawing.Rectangle]::new($x, $y, $right - $x, $bottom - $y)
}

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$destinationPath = if ([System.IO.Path]::IsPathRooted($Destination)) {
  $Destination
} else {
  Join-Path (Get-Location) $Destination
}
$sourceImage = [System.Drawing.Bitmap]::FromFile($sourcePath)

try {
  $components = [SpriteComponentScanner]::Find($sourcePath, $AlphaThreshold)
  $slotRects = New-Object 'System.Object[]' $Frames
  $slotAreas = New-Object 'System.Int32[]' $Frames
  $sourceFrameWidth = $sourceImage.Width / $Frames

  foreach ($component in $components) {
    if ($component.Area -lt $MinComponentArea) { continue }
    $nearestSlot = [int][Math]::Floor($component.CenterX / $sourceFrameWidth)
    if ($nearestSlot -ge $Frames) { $nearestSlot = $Frames - 1 }
    $positionInSlot = $component.CenterX - ($nearestSlot * $sourceFrameWidth)
    if ($nearestSlot -gt 0 -and $positionInSlot -lt ($sourceFrameWidth * $CarryoverRatio)) {
      $nearestSlot -= 1
    }

    $rect = [System.Drawing.Rectangle]::new($component.X, $component.Y, $component.Width, $component.Height)
    if ($KeepLargestOnly) {
      if ($component.Area -gt $slotAreas[$nearestSlot]) {
        $slotAreas[$nearestSlot] = $component.Area
        $slotRects[$nearestSlot] = $rect
      }
    } else {
      $slotRects[$nearestSlot] = Union-Rect $slotRects[$nearestSlot] $rect
    }
  }

  $targetSheet = [System.Drawing.Bitmap]::new($TargetFrameWidth * $Frames, $TargetFrameHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $targetSheet.SetResolution(96, 96)
  $graphics = [System.Drawing.Graphics]::FromImage($targetSheet)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  for ($slot = 0; $slot -lt $Frames; $slot++) {
    $rect = $slotRects[$slot]
    if ($null -eq $rect) {
      $rect = [System.Drawing.Rectangle]::new([int]($slot * $sourceFrameWidth), 0, [int]$sourceFrameWidth, $sourceImage.Height)
    }
    $rect = Expand-Rect $rect $CropPadding $sourceImage.Width $sourceImage.Height

    $scale = [Math]::Min(1, [Math]::Min(($TargetFrameWidth - 24) / $rect.Width, ($TargetFrameHeight - $GroundMargin) / $rect.Height))
    $targetWidth = [int][Math]::Round($rect.Width * $scale)
    $targetHeight = [int][Math]::Round($rect.Height * $scale)
    $targetX = ($slot * $TargetFrameWidth) + [int](($TargetFrameWidth - $targetWidth) / 2)
    $targetY = [int]($TargetFrameHeight - $GroundMargin - $targetHeight)
    if ($targetY -lt 0) { $targetY = 0 }

    $targetRect = [System.Drawing.Rectangle]::new($targetX, $targetY, $targetWidth, $targetHeight)
    $graphics.DrawImage($sourceImage, $targetRect, $rect, [System.Drawing.GraphicsUnit]::Pixel)
  }

  $graphics.Dispose()
  New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetDirectoryName($destinationPath)) | Out-Null
  $targetSheet.Save($destinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $targetSheet.Dispose()
  Write-Output $destinationPath
} finally {
  $sourceImage.Dispose()
}
