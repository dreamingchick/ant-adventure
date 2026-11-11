const L=[...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];
const V=[...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'];
const T=['',...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'];
const vowels={'ㅗㅏ':'ㅘ','ㅗㅐ':'ㅙ','ㅗㅣ':'ㅚ','ㅜㅓ':'ㅝ','ㅜㅔ':'ㅞ','ㅜㅣ':'ㅟ','ㅡㅣ':'ㅢ'};
const tails={'ㄱㅅ':'ㄳ','ㄴㅈ':'ㄵ','ㄴㅎ':'ㄶ','ㄹㄱ':'ㄺ','ㄹㅁ':'ㄻ','ㄹㅂ':'ㄼ','ㄹㅅ':'ㄽ','ㄹㅌ':'ㄾ','ㄹㅍ':'ㄿ','ㄹㅎ':'ㅀ','ㅂㅅ':'ㅄ'};
const splitTail=Object.fromEntries(Object.entries(tails).map(([a,b])=>[b,[...a]]));
const splitVowel=Object.fromEntries(Object.entries(vowels).map(([a,b])=>[b,[...a]]));
function parts(c){const n=c?.charCodeAt(0)-0xac00;if(n>=0&&n<11172)return {l:Math.floor(n/588),v:Math.floor(n%588/28),t:n%28};return null;}
function syllable(l,v,t=0){return String.fromCharCode(0xac00+l*588+v*28+t);}
export function appendJamo(text,c){const chars=[...text],last=chars.pop()||'',prefix=chars.join(''),p=parts(last),v=V.indexOf(c),l=L.indexOf(c);
  if(p){if(v>=0){if(p.t){const pair=splitTail[T[p.t]],move=pair?pair[1]:T[p.t],remain=pair?T.indexOf(pair[0]):0;return prefix+syllable(p.l,p.v,remain)+syllable(L.indexOf(move),v);}const combined=vowels[V[p.v]+c];if(combined)return prefix+syllable(p.l,V.indexOf(combined));}else if(l>=0){if(!p.t&&T.includes(c))return prefix+syllable(p.l,p.v,T.indexOf(c));const combined=tails[T[p.t]+c];if(combined)return prefix+syllable(p.l,p.v,T.indexOf(combined));}}
  else if(v>=0&&L.includes(last))return prefix+syllable(L.indexOf(last),v);
  else if(v>=0&&vowels[last+c])return prefix+vowels[last+c];
  return text+c;
}
export function eraseJamo(text){const chars=[...text],last=chars.pop(),prefix=chars.join(''),p=parts(last);if(p){if(p.t)return prefix+syllable(p.l,p.v,splitTail[T[p.t]]?T.indexOf(splitTail[T[p.t]][0]):0);if(splitVowel[V[p.v]])return prefix+syllable(p.l,V.indexOf(splitVowel[V[p.v]][0]));return prefix+L[p.l];}if(splitVowel[last])return prefix+splitVowel[last][0];return prefix;}
export class NameComposer{
  constructor(value=''){this.fixed=value;this.buffer='';this.selected=true;}
  get value(){return this.fixed+this.buffer;}
  commit(){this.fixed+=this.buffer;this.buffer='';this.selected=false;}
  feed(c){const next=appendJamo(this.selected?'':this.buffer,c),fixed=this.selected?'':this.fixed;if([...fixed+next].length>12)return false;this.fixed=fixed;this.buffer=next;this.selected=false;return true;}
  backspace(){if(this.selected){this.fixed='';this.buffer='';this.selected=false;}else if(this.buffer)this.buffer=eraseJamo(this.buffer);else this.fixed=[...this.fixed].slice(0,-1).join('');}
}
// Native IMEs follow the device orientation, not a CSS-rotated game stage.
export async function requestLandscape({doc=document,screenObject=screen,target=doc.documentElement,timeoutMs=1800}={}){
  if(typeof screenObject?.orientation?.lock!=='function')return false;
  let timer;
  try{
    const attempt=(async()=>{if(!doc.fullscreenElement){if(!target.requestFullscreen)throw Error('fullscreen unavailable');await target.requestFullscreen();}await screenObject.orientation.lock('landscape');return true;})();
    return await Promise.race([attempt,new Promise(resolve=>{timer=setTimeout(()=>{try{screenObject.orientation.unlock?.();}catch{}resolve(false);},timeoutMs);})]);
  }catch{return false;}finally{clearTimeout(timer);}
}
export function mountNameKeyboard({inputs,host,refresh,onSave,win=window,doc=document}){
  const panel=doc.querySelector('#name-keyboard'),preview=doc.querySelector('#name-preview'),keys=doc.querySelector('#name-keys');
  let composer,target,language='ko',shift=false,busy=false,nativeInput=null;
  const touch=()=>win.matchMedia('(pointer:coarse)').matches||win.navigator.maxTouchPoints>0;
  const rows=['qwertyuiop','asdfghjkl','zxcvbnm'];
  const map={q:'ㅂ',w:'ㅈ',e:'ㄷ',r:'ㄱ',t:'ㅅ',y:'ㅛ',u:'ㅕ',i:'ㅑ',o:'ㅐ',p:'ㅔ',a:'ㅁ',s:'ㄴ',d:'ㅇ',f:'ㄹ',g:'ㅎ',h:'ㅗ',j:'ㅓ',k:'ㅏ',l:'ㅣ',z:'ㅋ',x:'ㅌ',c:'ㅊ',v:'ㅍ',b:'ㅠ',n:'ㅜ',m:'ㅡ'};
  const shifted={q:'ㅃ',w:'ㅉ',e:'ㄸ',r:'ㄲ',t:'ㅆ',o:'ㅒ',p:'ㅖ'};
  const display=()=>{preview.textContent=composer.value||'이름을 입력해 주세요';preview.classList.toggle('selected',composer.selected);doc.querySelector('#name-length').textContent=[...composer.value].length+'/12';};
  function close(){panel.hidden=true;target?.blur();nativeInput=null;refresh();}
  function done(){target.value=composer.value.trim()||'개미';const input=target;close();onSave(input);}
  function insert(c){if(language==='ko')composer.feed(c);else{composer.feed(c);composer.commit();}shift=false;display();renderKeys();}
  function button(label,action,extra=''){const b=doc.createElement('button');b.type='button';b.textContent=label;b.className=extra;b.addEventListener('pointerdown',e=>e.preventDefault());b.onclick=action;return b;}
  function renderKeys(){keys.replaceChildren();const rowKeys=language==='num'?['1234567890','-_.']:rows;for(const row of rowKeys){const div=doc.createElement('div');div.className='name-key-row';for(const key of row){const c=language==='ko'?(shift&&shifted[key]||map[key]):shift?key.toUpperCase():key;div.append(button(c,()=>insert(c)));}keys.append(div);}const toolbar=doc.createElement('div');toolbar.className='name-key-row tools';for(const [mode,label]of [['ko','한글'],['en','ABC'],['num','123']])toolbar.append(button(label,()=>{if(!composer.selected)composer.commit();language=mode;shift=false;renderKeys();display();},mode===language?'active':''));toolbar.append(button('⇧',()=>{shift=!shift;renderKeys();},shift?'active':''),button('띄어쓰기',()=>{if(!composer.selected)composer.commit();composer.feed(' ');composer.commit();display();},'space'),button('⌫',()=>{composer.backspace();display();},'erase'));keys.append(toolbar);}
  function fallback(input){nativeInput=null;input.blur();target=input;composer=new NameComposer(input.value);language='ko';shift=false;panel.hidden=false;renderKeys();display();refresh();}
  async function open(input){if(busy)return;busy=true;input.blur();try{const locked=await requestLandscape({doc,screenObject:win.screen,target:host});refresh();if(locked){await new Promise(resolve=>win.requestAnimationFrame(()=>win.requestAnimationFrame(resolve)));nativeInput=input;input.readOnly=false;input.inputMode='text';input.focus({preventScroll:true});input.select();}else fallback(input);}finally{busy=false;}}
  for(const input of inputs){if(touch()){input.readOnly=true;input.inputMode='none';}input.addEventListener('pointerdown',e=>{if(!touch()||nativeInput===input)return;e.preventDefault();open(input);});input.addEventListener('keydown',e=>{if(touch()&&input.readOnly&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open(input);}});input.addEventListener('blur',()=>{if(touch()){input.readOnly=true;input.inputMode='none';}if(nativeInput===input)nativeInput=null;});}
  doc.querySelector('#name-done').onclick=done;doc.querySelector('#name-cancel').onclick=close;
  doc.addEventListener('keydown',e=>{if(panel.hidden)return;if(e.key==='Tab')return;e.preventDefault();e.stopImmediatePropagation();if(e.key==='Enter')done();else if(e.key==='Escape')close();else if(e.key==='Backspace'){composer.backspace();display();}else if(e.key.length===1)insert(language==='ko'&&map[e.key.toLowerCase()]?(e.shiftKey&&shifted[e.key.toLowerCase()]||map[e.key.toLowerCase()]):e.key);},true);
  doc.addEventListener('fullscreenchange',()=>{refresh();if(!doc.fullscreenElement&&nativeInput)fallback(nativeInput);});
  win.screen?.orientation?.addEventListener('change',()=>{refresh();if(nativeInput&&win.screen.orientation.type?.startsWith('portrait'))fallback(nativeInput);});
}
