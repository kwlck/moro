param([long]$WindowHandle,[string]$ReportPath,[int]$DeltaX=252,[int]$DeltaY=72)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class MoroDragTest {
  [StructLayout(LayoutKind.Sequential)] public struct RECT {public int left,top,right,bottom;}
  [StructLayout(LayoutKind.Sequential)] public struct POINT {public int x,y;}
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr handle,out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT point);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr handle);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint x,uint y,uint data,UIntPtr extra);
  [DllImport("user32.dll")] public static extern int GetWindowRgn(IntPtr handle,IntPtr region);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr handle,int index);
  [DllImport("gdi32.dll")] public static extern IntPtr CreateRectRgn(int left,int top,int right,int bottom);
  [DllImport("gdi32.dll")] public static extern bool PtInRegion(IntPtr region,int x,int y);
  [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr handle);
}
'@
$moroHandle = [IntPtr]$WindowHandle
$moroRect = New-Object MoroDragTest+RECT
$moroPointer = New-Object MoroDragTest+POINT
[MoroDragTest]::GetCursorPos([ref]$moroPointer) | Out-Null
[MoroDragTest]::GetWindowRect($moroHandle,[ref]$moroRect) | Out-Null
$moroStartX = [int](($moroRect.left + $moroRect.right)/2)
$moroStartY = $moroRect.top + 65
$moroSamples = [System.Collections.Generic.List[object]]::new()
$moroWatch = [Diagnostics.Stopwatch]::StartNew()
$moroRegion = [MoroDragTest]::CreateRectRgn(0,0,0,0)
$moroRegionType = [MoroDragTest]::GetWindowRgn($moroHandle,$moroRegion)
$moroWidth = $moroRect.right - $moroRect.left
$moroHeight = $moroRect.bottom - $moroRect.top
$moroRegionCheck = @{
  type=$moroRegionType
  topLeft=[MoroDragTest]::PtInRegion($moroRegion,0,0)
  topRight=[MoroDragTest]::PtInRegion($moroRegion,($moroWidth-1),0)
  bottomLeft=[MoroDragTest]::PtInRegion($moroRegion,0,($moroHeight-1))
  bottomRight=[MoroDragTest]::PtInRegion($moroRegion,($moroWidth-1),($moroHeight-1))
  center=[MoroDragTest]::PtInRegion($moroRegion,[int]($moroWidth/2),[int]($moroHeight/2))
  thickFrame=([MoroDragTest]::GetWindowLong($moroHandle,-16) -band 0x00040000) -ne 0
}
[MoroDragTest]::DeleteObject($moroRegion) | Out-Null
try {
  [MoroDragTest]::SetForegroundWindow($moroHandle) | Out-Null
  [MoroDragTest]::SetCursorPos($moroStartX,$moroStartY) | Out-Null
  Start-Sleep -Milliseconds 150
  [MoroDragTest]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
  Start-Sleep -Milliseconds 120
  for ($moroStep=1; $moroStep -le 36; $moroStep++) {
    [MoroDragTest]::SetCursorPos(($moroStartX + [int]($moroStep*$DeltaX/36)),($moroStartY + [int]($moroStep*$DeltaY/36))) | Out-Null
    Start-Sleep -Milliseconds 16
    [MoroDragTest]::GetWindowRect($moroHandle,[ref]$moroRect) | Out-Null
    $moroSamples.Add(@{x=$moroRect.left;y=$moroRect.top;ms=$moroWatch.ElapsedMilliseconds;phase='drag'})
  }
  [MoroDragTest]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
  for ($moroStep=0; $moroStep -lt 60; $moroStep++) {
    Start-Sleep -Milliseconds 16
    [MoroDragTest]::GetWindowRect($moroHandle,[ref]$moroRect) | Out-Null
    $moroSamples.Add(@{x=$moroRect.left;y=$moroRect.top;ms=$moroWatch.ElapsedMilliseconds;phase='release'})
  }
} finally {
  [MoroDragTest]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
  [MoroDragTest]::SetCursorPos($moroPointer.x,$moroPointer.y) | Out-Null
}
@{samples=$moroSamples;region=$moroRegionCheck} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ReportPath -Encoding utf8
