const fs=require('fs'),assert=require('assert');
const path=require('path');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'dist')+path.sep;
const cfg=JSON.parse(fs.readFileSync(out+'timeline.json'));
const source=fs.readFileSync(out+'player.js','utf8');
const start=source.indexOf('FPUb(e,t,n)');
const end=source.indexOf('},n6wb(e,t,n)',start);
const playerModule=source.slice(start+'FPUb'.length,end+1);
let now=0,slots=[],cursor=0,effects=[],activeEffects=[],requests=new Map(),timers=new Map(),nextId=0,reduced=false,bubbles=[],listeners=new Map();
const s={useState(initial){const id=cursor++;if(!(id in slots))slots[id]=initial;return[slots[id],x=>slots[id]=x];},useRef(initial){const id=cursor++;if(!(id in slots))slots[id]={current:initial};return slots[id];},useEffect(fn,deps){effects.push({fn,deps});}};
const win={innerWidth:240,innerHeight:240,addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},requestAnimationFrame(fn){requests.set(++nextId,fn);return nextId;},cancelAnimationFrame(id){requests.delete(id);},setTimeout(fn,ms){timers.set(++nextId,{fn,at:now+ms});return nextId;},clearTimeout(id){timers.delete(id);}};
const doc={createElement(){return{style:{},setAttribute(){},getBoundingClientRect(){return{width:94,height:32};},remove(){bubbles=bubbles.filter(x=>x!==this);}};},body:{appendChild(el){bubbles.push(el);}}};
const modules={zd8w:s,IjbW:{I:()=>reduced},ABep:{jsx:(tag,props)=>props},on57:{A:(...x)=>x.filter(Boolean).join(' ')}};
const requireModule=id=>modules[id];
requireModule.d=(exports,getters)=>Object.defineProperties(exports,Object.fromEntries(
  Object.entries(getters).map(([key,get])=>[key,{get}])
));
const exportsForTest={};
new Function('loadModule','exports','window','performance','document',
  'const factory=function'+playerModule+';factory({},exports,loadModule);'
)(requireModule,exportsForTest,win,{now:()=>now},doc);
const player=exportsForTest.bH;
let props={assetMap:{},source:{petId:cfg.id,spriteRowCount:11,spritesheetUrl:'original'},className:'codex-avatar-root relative z-10'},element={style:{},getBoundingClientRect(){return{left:70,top:70,bottom:200,width:100};}},rendered;
function render(){cursor=0;effects=[];rendered=player(props);rendered.ref.current=element;effects.forEach((e,index)=>{const old=activeEffects[index];if(!old||e.deps.some((x,i)=>x!==old.deps[i])){old?.cleanup?.();activeEffects[index]={deps:e.deps,cleanup:e.fn()};}});return rendered;}
function advance(ms){now=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}const todo=[...requests.values()];requests.clear();todo.forEach(fn=>fn(now));render();}
function pointer(type,x=100,y=100){const e={pointerId:1,screenX:x,screenY:y,button:0,isPrimary:true};if(type==='down')rendered.onPointerDownCapture(e);else for(const fn of [...(listeners.get('pointer'+type)||[])])fn(e);}
function click(){pointer('down');pointer('up');render();}
function frame(row,col){assert.strictEqual(element.style.backgroundPosition,`${col/7*100}% ${row/13*100}%`);}
render();frame(11,3);click();frame(13,0);assert.strictEqual(bubbles[0].textContent,'嘎嘎滴辣虾！');
advance(500);click();frame(13,0);assert.strictEqual(bubbles[0].textContent,'安迪~');
advance(1800);assert.ok(slots[0],'restart must replace the previous completion deadline');
pointer('down');pointer('move',80);render();frame(2,0);assert.strictEqual(bubbles.length,0);assert.strictEqual(slots[0],false);
for(const x of [81,80,82,83]){pointer('move',x);render();frame(2,0);} // Ignore sub-threshold jitter.
pointer('move',84);render();frame(1,0); // Accumulated reversal, still left of press origin.
advance(1900);const beforeVertical=element.style.backgroundPosition;
pointer('move',84,110);render();assert.strictEqual(element.style.backgroundPosition,beforeVertical,'vertical movement must not restart or reverse running');
pointer('move',82,110);render();assert.strictEqual(rendered['data-codex-pet-state'],'running-right');
pointer('move',80,110);render();frame(2,0);
pointer('up',80,110);render();assert.strictEqual(rendered['data-codex-pet-state'],'idle');
click();assert.strictEqual(bubbles[0].textContent,'嘎嘎滴辣虾！');pointer('down');pointer('move',120);render();frame(1,0);pointer('move',117);render();frame(1,0);pointer('move',116);render();frame(2,0);pointer('up',116);render();
advance(5000);assert.strictEqual(rendered['data-codex-pet-state'],'idle');assert.strictEqual(bubbles.length,0);
click();
const outfitMs=cfg.hover.reduce((sum,frame)=>sum+frame.frameDurationMs,0);
advance(5000+outfitMs-1);frame(13,7);assert.strictEqual(bubbles[0].textContent,'安迪~');
advance(5000+outfitMs);frame(11,3);assert.strictEqual(bubbles.length,0,'speech must end with the outfit');
console.log('PASS: directional hysteresis and accumulated reversal; click restarts timing and alternates speech; left/right drag interrupts and does not resume costume.');
