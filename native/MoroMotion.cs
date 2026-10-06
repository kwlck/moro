using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Threading;

// A private stdin/stdout worker. Only windows owned by the launching Moro process
// are accepted. Window movement never runs on Electron's JavaScript timer queue.
class MoroMotion {
  [StructLayout(LayoutKind.Sequential)] struct RECT {public int left,top,right,bottom;}
  [StructLayout(LayoutKind.Sequential)] struct POINT {public int x,y;}
  [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(POINT point);
  [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr hwnd,uint flags);
  [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr hwnd,int index);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr hwnd,uint command);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hwnd);
  [DllImport("user32.dll",EntryPoint="SendMessageTimeoutW")] static extern IntPtr SendMessageTimeout(IntPtr hwnd,uint message,UIntPtr wParam,IntPtr lParam,uint flags,uint timeout,out UIntPtr result);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd,out RECT rect);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hwnd,IntPtr after,int x,int y,int cx,int cy,uint flags);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint pid);
  [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
  [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr context);
  [DllImport("dwmapi.dll")] static extern int DwmFlush();
  [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr hwnd,uint attribute,ref int value,uint size);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr hwnd,uint attribute,out int value,uint size);
  [DllImport("user32.dll")] static extern bool ShowWindowAsync(IntPtr hwnd,int command);
  [DllImport("winmm.dll")] static extern uint timeBeginPeriod(uint ms);
  [DllImport("winmm.dll")] static extern uint timeEndPeriod(uint ms);
  static readonly CultureInfo CI=CultureInfo.InvariantCulture;
  static readonly object outputLock=new object();
  static readonly object stackLock=new object();
  static IntPtr guardedPlayer,guardedController;
  static long stackRaises=0;
  static long revision=0;
  static uint owner;
  static void Write(string text){lock(outputLock){Console.WriteLine(text);Console.Out.Flush();}}
  static bool Current(long token){return Interlocked.Read(ref revision)==token;}
  static bool Owned(IntPtr hwnd){uint pid;return GetWindowThreadProcessId(hwnd,out pid)!=0&&pid==owner;}
  static bool VisibleOwned(IntPtr hwnd){return Owned(hwnd)&&IsWindowVisible(hwnd)&&!IsIconic(hwnd);}
  static bool Covered(IntPtr hwnd){
    RECT target;if(!VisibleOwned(hwnd)||!GetWindowRect(hwnd,out target))return false;
    // Inspect the real stacking order: two TOPMOST windows can cover each other.
    IntPtr above=GetWindow(hwnd,3);
    for(int n=0;above!=IntPtr.Zero&&n<256;n++,above=GetWindow(above,3)){
      if(Owned(above)||!IsWindowVisible(above)||IsIconic(above))continue;
      int cloaked;if(DwmGetWindowAttribute(above,14,out cloaked,4)==0&&cloaked!=0)continue;
      RECT other;if(GetWindowRect(above,out other)&&other.left<target.right&&other.right>target.left&&other.top<target.bottom&&other.bottom>target.top)return true;
    }
    return false;
  }
  static bool Raise(IntPtr hwnd){
    // NOSIZE | NOMOVE | NOACTIVATE | NOOWNERZORDER | ASYNCWINDOWPOS.
    // Never take focus from a game or interfere with the movement animation.
    if(!VisibleOwned(hwnd))return false;
    bool ok=SetWindowPos(hwnd,new IntPtr(-1),0,0,0,0,0x4213);
    if(ok)Interlocked.Increment(ref stackRaises);return ok;
  }
  static void MaintainStack(){lock(stackLock){
    bool playerRaised=false;
    if(VisibleOwned(guardedPlayer)&&((GetWindowLong(guardedPlayer,-20)&8)==0||Covered(guardedPlayer)))playerRaised=Raise(guardedPlayer);
    // Keep the launcher above the player when both are open.
    if(VisibleOwned(guardedController)&&(playerRaised||(GetWindowLong(guardedController,-20)&8)==0||Covered(guardedController)))Raise(guardedController);
  }}
  static double Progress(double t,double response,double bounce){
    double omega=8+response*.10;
    if(bounce<=0)return 1-(1+omega*t)*Math.Exp(-omega*t);
    double damping=1-bounce/24*.18,wd=omega*Math.Sqrt(1-damping*damping);
    return 1-Math.Exp(-damping*omega*t)*(Math.Cos(wd*t)+damping*omega/wd*Math.Sin(wd*t));
  }
  static void Animate(long token,long id,IntPtr hwnd,int targetX,int targetY,double response,double bounce){
    var intervals=new List<double>();var samples=new List<string>();var watch=Stopwatch.StartNew();
    RECT start;int frames=0,moves=0,failed=0;double previous=0;bool completed=false;
    int lastX=targetX,lastY=targetY;
    try{
      if(!Owned(hwnd)||!GetWindowRect(hwnd,out start))return;
      lastX=start.left;lastY=start.top;timeBeginPeriod(1);
      while(Current(token)&&Owned(hwnd)&&(GetAsyncKeyState(1)&0x8000)==0){
        double waitStart=watch.Elapsed.TotalMilliseconds;
        int flushed=DwmFlush();
        if(flushed!=0||watch.Elapsed.TotalMilliseconds-waitStart<1)Thread.Sleep(8);
        if(!Current(token)||(GetAsyncKeyState(1)&0x8000)!=0)break;
        double ms=watch.Elapsed.TotalMilliseconds,t=ms/1000,progress=Progress(t,response,bounce);
        int x=(int)Math.Round(start.left+(targetX-start.left)*progress),y=(int)Math.Round(start.top+(targetY-start.top)*progress);
        bool done=t>1.2||(t>.25&&Math.Sqrt(Math.Pow(targetX-x,2)+Math.Pow(targetY-y,2))<.5);
        if(done){x=targetX;y=targetY;}
        if(x!=lastX||y!=lastY){
          // NOSIZE | NOZORDER | NOACTIVATE | NOOWNERZORDER: retain geometry,
          // focus and stacking, and let DWM move the existing window surface.
          if(!SetWindowPos(hwnd,IntPtr.Zero,x,y,0,0,0x0215)){failed++;break;}
          lastX=x;lastY=y;moves++;
          samples.Add("{\"ms\":"+watch.Elapsed.TotalMilliseconds.ToString("F3",CI)+",\"x\":"+x+",\"y\":"+y+"}");
        }
        double now=watch.Elapsed.TotalMilliseconds;if(frames>0)intervals.Add(now-previous);previous=now;frames++;
        if(done){completed=true;break;}
      }
    }catch(Exception){failed++;}
    finally{
      timeEndPeriod(1);intervals.Sort();double sum=0;foreach(double ms in intervals)sum+=ms;
      double mean=intervals.Count>0?sum/intervals.Count:0,p95=intervals.Count>0?intervals[Math.Min(intervals.Count-1,(int)(intervals.Count*.95))]:0,max=intervals.Count>0?intervals[intervals.Count-1]:0;
      Write("{\"type\":\"end\",\"id\":"+id+",\"completed\":"+(completed?"true":"false")+",\"frames\":"+frames+",\"moves\":"+moves+",\"durationMs\":"+watch.Elapsed.TotalMilliseconds.ToString("F3",CI)+",\"meanMs\":"+mean.ToString("F3",CI)+",\"p95Ms\":"+p95.ToString("F3",CI)+",\"maxMs\":"+max.ToString("F3",CI)+",\"failures\":"+failed+",\"x\":"+lastX+",\"y\":"+lastY+",\"samples\":["+String.Join(",",samples.ToArray())+"]}");
    }
  }
  static int Main(string[] args){
    if(args.Length!=1||!uint.TryParse(args[0],out owner))return 2;
    try{SetProcessDpiAwarenessContext(new IntPtr(-4));}catch(EntryPointNotFoundException){}
    Write("{\"type\":\"ready\"}");string line;
    bool held=false;var keys=new Timer(_=>{bool next=(GetAsyncKeyState(0x11)&0x8000)!=0;if(next!=held){held=next;Write("{\"type\":\"keys\",\"held\":"+(held?"true":"false")+"}");}},null,0,20);
    var stack=new Timer(_=>MaintainStack(),null,100,100);
    while((line=Console.ReadLine())!=null){
      if(line=="cancel"){Interlocked.Increment(ref revision);continue;}
      if(line=="quit")break;
      string[] parts=line.Split(' ');long id,handle;int x,y;double response,bounce;
      long controllerHandle;
      if(parts.Length==3&&parts[0]=="guard"&&long.TryParse(parts[1],out handle)&&long.TryParse(parts[2],out controllerHandle)&&Owned(new IntPtr(handle))&&Owned(new IntPtr(controllerHandle))){
        lock(stackLock){guardedPlayer=new IntPtr(handle);guardedController=new IntPtr(controllerHandle);}MaintainStack();continue;
      }
      if(parts.Length==3&&parts[0]=="stack"&&long.TryParse(parts[1],out id)&&long.TryParse(parts[2],out handle)&&Owned(new IntPtr(handle))){
        var hwnd=new IntPtr(handle);
        Write("{\"type\":\"stack\",\"id\":"+id+",\"visible\":"+(VisibleOwned(hwnd)?"true":"false")+",\"topmost\":"+((GetWindowLong(hwnd,-20)&8)!=0?"true":"false")+",\"covered\":"+(Covered(hwnd)?"true":"false")+",\"raises\":"+Interlocked.Read(ref stackRaises)+",\"foreground\":\""+GetForegroundWindow().ToInt64()+"\"}");continue;
      }
      if(parts.Length==2&&parts[0]=="reveal"&&long.TryParse(parts[1],out handle)&&Owned(new IntPtr(handle))){
        var hwnd=new IntPtr(handle);ShowWindowAsync(hwnd,4);
        SetWindowPos(hwnd,new IntPtr(-1),0,0,0,0,0x0053);continue;
      }
      if(parts.Length==3&&parts[0]=="protect"&&long.TryParse(parts[1],out id)&&long.TryParse(parts[2],out handle)&&Owned(new IntPtr(handle))){
        var hwnd=new IntPtr(handle);int enabled=1;
        // DWM Peek must not fade this floating player with the other windows.
        bool peekDisabled=DwmSetWindowAttribute(hwnd,11,ref enabled,4)==0;
        bool peekExcluded=DwmSetWindowAttribute(hwnd,12,ref enabled,4)==0;
        bool transitionsDisabled=DwmSetWindowAttribute(hwnd,3,ref enabled,4)==0;
        Write("{\"type\":\"protect\",\"id\":"+id+",\"peekDisabled\":"+(peekDisabled?"true":"false")+",\"peekExcluded\":"+(peekExcluded?"true":"false")+",\"transitionsDisabled\":"+(transitionsDisabled?"true":"false")+"}");continue;
      }
      if(parts.Length==5&&parts[0]=="inspect"&&long.TryParse(parts[1],out id)&&long.TryParse(parts[2],out handle)&&int.TryParse(parts[3],out x)&&int.TryParse(parts[4],out y)&&Owned(new IntPtr(handle))){var hwnd=new IntPtr(handle);bool transparent=(GetWindowLong(hwnd,-20)&0x20)!=0,hits=GetAncestor(WindowFromPoint(new POINT{x=x,y=y}),2)==hwnd;UIntPtr code;var success=SendMessageTimeout(hwnd,0x84,UIntPtr.Zero,new IntPtr(unchecked((int)(((y&0xffff)<<16)|(x&0xffff)))),3,500,out code);long hitCode=success!=IntPtr.Zero?unchecked((long)code.ToUInt64()):-999;Write("{\"type\":\"inspect\",\"id\":"+id+",\"transparent\":"+(transparent?"true":"false")+",\"hits\":"+(hits?"true":"false")+",\"hitCode\":"+hitCode+"}");continue;}
      if(parts.Length!=7||parts[0]!="move"||!long.TryParse(parts[1],out id)||!long.TryParse(parts[2],out handle)||!int.TryParse(parts[3],out x)||!int.TryParse(parts[4],out y)||!double.TryParse(parts[5],NumberStyles.Float,CI,out response)||!double.TryParse(parts[6],NumberStyles.Float,CI,out bounce))continue;
      if(Math.Abs((long)x)>10000000||Math.Abs((long)y)>10000000||Double.IsNaN(response)||Double.IsNaN(bounce)||response<20||response>100||bounce<0||bounce>24||!Owned(new IntPtr(handle)))continue;
      long token=Interlocked.Increment(ref revision);var worker=new Thread(()=>Animate(token,id,new IntPtr(handle),x,y,response,bounce));worker.IsBackground=true;worker.Start();
    }
    keys.Dispose();stack.Dispose();Interlocked.Increment(ref revision);return 0;
  }
}
