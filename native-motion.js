'use strict';
const {spawn}=require('node:child_process');
const readline=require('node:readline');
class NativeMotion {
  constructor(executable){
    this.pending=new Map();this.sequence=0;this.available=false;this.lastReport=null;
    this.ready=new Promise(resolve=>{this.resolveReady=resolve;});
    this.child=spawn(executable,[String(process.pid)],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    const timer=setTimeout(()=>this.resolveReady(false),4000);timer.unref();
    readline.createInterface({input:this.child.stdout}).on('line',line=>{
      let report;try{report=JSON.parse(line);}catch{return;}
      if(report.type==='ready'){clearTimeout(timer);this.available=true;this.resolveReady(true);}
      if(report.type==='keys')this.onKeys?.(report.held===true);
      if(['end','inspect','protect','stack'].includes(report.type)){if(report.type==='end')this.lastReport=report;const callback=this.pending.get(report.id);if(callback){this.pending.delete(report.id);callback(report);}}
    });
    this.child.stderr.on('data',data=>console.error('[native-motion]',String(data).slice(0,500)));
    const fail=()=>{clearTimeout(timer);this.available=false;this.resolveReady(false);for(const done of this.pending.values())done({completed:false,failures:1});this.pending.clear();};
    this.child.on('error',fail);this.child.on('exit',fail);this.child.stdin.on('error',fail);
  }
  move(handle,point,settings){const id=++this.sequence;const finished=new Promise(resolve=>this.pending.set(id,resolve));this.child.stdin.write(`move ${id} ${handle} ${point.x} ${point.y} ${settings.response} ${settings.bounce}\n`);return {id,finished};}
  inspect(handle,point){const id=++this.sequence;const result=new Promise(resolve=>this.pending.set(id,resolve));this.child.stdin.write(`inspect ${id} ${handle} ${point.x} ${point.y}\n`);return result;}
  protect(handle){const id=++this.sequence;const result=new Promise(resolve=>this.pending.set(id,resolve));this.child.stdin.write(`protect ${id} ${handle}\n`);return result;}
  guard(player,controller){if(this.available)this.child.stdin.write(`guard ${player} ${controller}\n`);}
  stack(handle){const id=++this.sequence;const result=new Promise(resolve=>this.pending.set(id,resolve));this.child.stdin.write(`stack ${id} ${handle}\n`);return result;}
  reveal(handle){if(this.available)this.child.stdin.write(`reveal ${handle}\n`);}
  cancel(){if(this.available)this.child.stdin.write('cancel\n');}
  dispose(){this.available=false;this.child.stdin.end('quit\n');}
}
module.exports={NativeMotion};
