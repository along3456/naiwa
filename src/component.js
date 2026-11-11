/* Naiwa-only player. Other pets use their original player unchanged. */
let naiwaSpeechIndex=0;
function naiwaSay(anchor){
  const bubble=document.createElement("div");
  bubble.textContent=NAIWA.speechTexts[naiwaSpeechIndex%NAIWA.speechTexts.length];
  bubble.setAttribute("role","status");bubble.setAttribute("aria-live","polite");
  bubble.setAttribute("data-naiwa-speech","");
  Object.assign(bubble.style,{position:"fixed",zIndex:"2147483647",pointerEvents:"none",boxSizing:"border-box",padding:"7px 9px",border:"1px solid #d9bd86",borderRadius:"12px",background:"#fff9e9",color:"#503817",font:"600 12px/1.4 system-ui,sans-serif",textAlign:"center",boxShadow:"0 3px 12px #34220b24",width:"max-content",maxWidth:Math.max(48,Math.min(180,window.innerWidth-16))+"px",overflowWrap:"anywhere"});
  document.body.appendChild(bubble);
  naiwaSpeechIndex=(naiwaSpeechIndex+1)%NAIWA.speechTexts.length;
  let removed=false;
  function place(){
    if(removed)return;
    const pet=anchor.getBoundingClientRect(),box=bubble.getBoundingClientRect(),gap=7;
    let top=pet.top-box.height-gap;
    if(top<4&&pet.bottom+box.height+gap<=window.innerHeight-4)top=pet.bottom+gap;
    bubble.style.top=Math.max(4,Math.min(window.innerHeight-box.height-4,top))+"px";
    bubble.style.left=Math.max(4,Math.min(window.innerWidth-box.width-4,pet.left+pet.width/2-box.width/2))+"px";
  }
  place();window.addEventListener("resize",place);window.addEventListener("scroll",place,true);
  function remove(){if(removed)return;removed=true;window.clearTimeout(timer);bubble.remove();window.removeEventListener("resize",place);window.removeEventListener("scroll",place,true);}
  const timer=window.setTimeout(remove,NAIWA.speechMs);
  return remove;
}
function naiwaClickGesture(event,run,onDrag=()=>{},onEnd=()=>{}){
  const id=event.pointerId,x=event.screenX,y=event.screenY;
  let moved=false,finished=false,lastX=x,direction=null;
  function track(e){
    if(e.pointerId!==id||finished)return;
    const dx=e.screenX-lastX;lastX=e.screenX;
    if(!moved&&Math.hypot(e.screenX-x,e.screenY-y)<=6)return;
    moved=true;
    const next=dx<0?"running-left":dx>0?"running-right":direction||(e.screenX<x?"running-left":"running-right");
    if(next!==direction){direction=next;onDrag(next);}
  }
  function clean(){finished=true;window.removeEventListener("pointermove",track,true);window.removeEventListener("pointerup",release,true);window.removeEventListener("pointercancel",cancel,true);}
  function release(e){if(e.pointerId!==id||finished)return;track(e);clean();if(!moved)run();else onEnd();}
  function cancel(e){if(e.pointerId===id){clean();onEnd();}}
  window.addEventListener("pointermove",track,true);window.addEventListener("pointerup",release,true);window.addEventListener("pointercancel",cancel,true);
  return clean;
}
let y=({assetMap:e,className:t,lookFrame:n,loop:o=!1,respondToHover:u=!1,size:d="default",source:c,state:p="idle"})=>{
  let [h,f]=(0,s.useState)(!1),g=(0,s.useRef)(null),gesture=(0,s.useRef)(null),epoch=(0,s.useRef)(null),reduced=(0,a.I)();
  let custom=c.petId===NAIWA.id;
  let serial=(0,s.useRef)(0),[drag,setDrag]=(0,s.useState)(null);
  let speech=(0,s.useRef)(null),interactive=custom&&(u||String(t??"").includes("codex-avatar-root"));
  (0,s.useEffect)(()=>()=>{speech.current?.();speech.current=null;gesture.current?.();gesture.current=null;},[custom]);
  let running=drag||(p==="running-left"||p==="running-right"?p:null);
  (0,s.useEffect)(()=>{if(custom&&running){f(false);speech.current?.();speech.current=null;}},[custom,running]);
  let E=custom?(running|| (h?"jumping":"idle")):u&&h?"jumping":p;
  let I=custom?NAIWA.rows:null==c.assetRef?c.spriteRowCount:l.rows;
  let look=custom&&(h||running)?null:n;
  (0,s.useEffect)(()=>{
    let el=g.current;if(!el)return;
    if(look!=null){el.style.backgroundPosition=v(look,I);return;}
    if(custom){
      let frames=E==="jumping"?NAIWA.hover:E==="idle"?NAIWA.idle:m(E,false,true).frames;
      if(reduced){
        el.style.backgroundPosition=v(E==="jumping"?NAIWA.hover[4]:{rowIndex:0,columnIndex:0},I);
        if(h){let timer=window.setTimeout(()=>f(false),NAIWA.hoverMs);return()=>window.clearTimeout(timer);}
        return;
      }
      let total=frames.reduce((sum,frame)=>sum+frame.frameDurationMs,0);
      let start=performance.now(),raf=null,last=-1;
      if(E==="idle"){if(epoch.current==null)epoch.current=start;start=epoch.current;}
      function tick(now){
        let elapsed=Math.max(0,now-start);
        if(E==="jumping"&&elapsed>=total){epoch.current=null;f(false);return;}
        let phase=elapsed%total,index=0;
        while(index<frames.length-1&&phase>=frames[index].frameDurationMs){phase-=frames[index].frameDurationMs;index++;}
        if(index!==last){el.style.backgroundPosition=v(frames[index],I);last=index;}
        raf=window.requestAnimationFrame(tick);
      }
      tick(performance.now());return()=>{if(raf!=null)window.cancelAnimationFrame(raf);};
    }
    let plan=m(E,reduced,o),frames=plan.frames,index=0,timer=null;
    el.style.backgroundPosition=v(_(frames,index),I);if(frames.length===1)return;
    function step(){timer=window.setTimeout(()=>{let next=index+1;
      if(next>=frames.length){if(plan.loopStartIndex!=null){index=plan.loopStartIndex;el.style.backgroundPosition=v(_(frames,index),I);step();return;}timer=null;return;}
      index=next;el.style.backgroundPosition=v(_(frames,index),I);step();
    },_(frames,index).frameDurationMs);}
    step();return()=>{if(timer!=null)window.clearTimeout(timer);};
  },[E,look,o,reduced,I,custom,h]);
  return(0,r.jsx)("div",{ref:g,className:(0,i.A)("Root-acw8Rg","container"===d&&"Container-AAUiZc",t),
    "data-codex-pet-asset-ref":c.assetRef,"data-codex-pet-id":c.assetRef??c.petId,"data-codex-pet-state":E,
    onPointerEnter:()=>{if(!custom&&u)f(true);},
    onPointerLeave:()=>{if(!custom&&u)f(false);},
    onPointerDownCapture:event=>{
      if(!interactive||event.button!==0||event.isPrimary===false)return;
      gesture.current?.();
      gesture.current=naiwaClickGesture(event,()=>{speech.current?.();if(g.current)speech.current=naiwaSay(g.current);f(++serial.current);},direction=>{f(false);speech.current?.();speech.current=null;setDrag(direction);},()=>setDrag(null));
    },
    style:{backgroundImage:`url(${custom?NAIWA.url:c.spritesheetUrl??e[c.assetRef]})`,backgroundSize:I==null?undefined:`${100*l.columns}% ${100*I}%`},"aria-hidden":"true"});
};
