const fs=require('fs'),assert=require('assert');
const path=require('path');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'dist')+path.sep;
const cfg=JSON.parse(fs.readFileSync(out+'timeline.json'));
const source=fs.readFileSync(path.join(root,'vendor/original-player.js'),'utf8');
const start=source.indexOf('let c=l.columns',source.indexOf('FPUb(e,t,n)'));
const oldHelpers=source.slice(start,source.indexOf('let y=({assetMap:',start));
let now=0,slots=[],cursor=0,effects=[],activeEffects=[],requests=new Map(),timers=new Map(),nextId=0,reduced=false,bubbles=[],listeners=new Map();
const s={useState(initial){const id=cursor++;if(!(id in slots))slots[id]=initial;return[slots[id],x=>slots[id]=x];},useRef(initial){const id=cursor++;if(!(id in slots))slots[id]={current:initial};return slots[id];},useEffect(fn,deps){effects.push({fn,deps});}};
const win={innerWidth:240,innerHeight:240,addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},requestAnimationFrame(fn){requests.set(++nextId,fn);return nextId;},cancelAnimationFrame(id){requests.delete(id);},setTimeout(fn,ms){timers.set(++nextId,{fn,at:now+ms});return nextId;},clearTimeout(id){timers.delete(id);}};
const doc={createElement(){return{style:{},setAttribute(){},getBoundingClientRect(){return{width:94,height:32};},remove(){bubbles=bubbles.filter(x=>x!==this);}};},body:{appendChild(el){bubbles.push(el);}}};
const player=new Function('s','a','r','i','NAIWA','window','performance','document','const l={columns:8,rows:11};'+oldHelpers+fs.readFileSync(path.join(root,'src/component.js'),'utf8')+';return y;')(s,{I:()=>reduced},{jsx:(tag,props)=>props},{A:(...x)=>x.filter(Boolean).join(' ')},cfg,win,{now:()=>now},doc);
let props={assetMap:{},source:{petId:cfg.id,spriteRowCount:11,spritesheetUrl:'original'},respondToHover:true},element={style:{},getBoundingClientRect(){return{left:70,top:70,bottom:200,width:100};}},rendered;
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
console.log('PASS: directional hysteresis and accumulated reversal; click restarts timing and alternates speech; left/right drag interrupts and does not resume costume.');
