import test from 'node:test';import assert from 'node:assert/strict';
import {NameComposer,requestLandscape}from'../dist/name-keyboard.js';
const type=chars=>{const c=new NameComposer();for(const k of chars)c.feed(k);return c;};
test('landscape fallback composes a Korean name with final consonants',()=>{assert.equal(type('ㅅㅣㄴㅂㅣㅎㅏㄴㄱㅏㄹㅜ').value,'신비한가루');assert.equal(type('ㄱㅐㅁㅣ').value,'개미');});
test('complex vowels, compound tails and migration to next syllable',()=>{assert.equal(type('ㄱㅗㅏㄴㅈㅏㅇ').value,'관장');assert.equal(type('ㄷㅏㄹㄱㅇㅣ').value,'닭이');assert.equal(type('ㅇㅣㄹㄱㅓ').value,'일거');assert.equal(type('ㄲㅗㅊㅇㅣ').value,'꽃이');});
test('backspace removes composing jamo in reverse order without corrupting committed names',()=>{const c=type('ㄷㅏㄹㄱ');assert.equal(c.value,'닭');c.backspace();assert.equal(c.value,'달');c.backspace();assert.equal(c.value,'다');c.backspace();assert.equal(c.value,'ㄷ');c.backspace();assert.equal(c.value,'');const existing=new NameComposer('신비한가루');existing.commit();existing.backspace();assert.equal(existing.value,'신비한가');});
test('name entry replaces initial selection, permits Latin/digits and caps at 12 chars',()=>{const c=new NameComposer('개미');c.feed('A');c.commit();c.feed('1');c.commit();assert.equal(c.value,'A1');for(let i=0;i<20;i++)c.feed('x');assert.equal(c.value.length,12);});
test('native keyboard requires fullscreen before landscape lock',async()=>{const calls=[],doc={fullscreenElement:null},target={async requestFullscreen(){calls.push('fullscreen');doc.fullscreenElement=target;}},orientation={async lock(value){calls.push(value);}};assert.equal(await requestLandscape({doc,target,screenObject:{orientation}}),true);assert.deepEqual(calls,['fullscreen','landscape']);});
test('unsupported or rejected orientation returns fallback instead of opening portrait IME',async()=>{assert.equal(await requestLandscape({doc:{},screenObject:{}}),false);assert.equal(await requestLandscape({doc:{fullscreenElement:true},screenObject:{orientation:{lock:()=>Promise.reject(new Error('not supported'))}}}),false);});
test('fullscreen failure does not attempt orientation lock',async()=>{let called=false;assert.equal(await requestLandscape({doc:{},target:{requestFullscreen:()=>Promise.reject(new Error('denied'))},screenObject:{orientation:{lock(){called=true;}}}}),false);assert.equal(called,false);});
test('pending orientation request times out safely and releases lock',async()=>{let unlocked=false;assert.equal(await requestLandscape({doc:{fullscreenElement:true},screenObject:{orientation:{lock:()=>new Promise(()=>{}),unlock(){unlocked=true;}}},timeoutMs:5}),false);assert.equal(unlocked,true);});

// DOM adapter verifies that touch entry never focuses a portrait native field
// when the orientation APIs reject the request.
import {mountNameKeyboard}from'../dist/name-keyboard.js';
class Node{
  children=[];handlers={};hidden=true;value='기존 이름';focuses=0;style={};classList={toggle(){}};
  addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}
  emit(name,event={}){for(const fn of this.handlers[name]||[])fn(event);}
  append(...children){this.children.push(...children);}replaceChildren(...children){this.children=[...children];}
  matches(){return true;}blur(){this.emit('blur');}focus(){this.focuses++;}select(){}
}
function keyboardHarness(orientation){const input=new Node(),doc=new Node(),ids={};for(const id of ['name-keyboard','name-preview','name-keys','name-length','name-done','name-cancel'])ids[id]=new Node();doc.querySelector=selector=>ids[selector.slice(1)];doc.createElement=()=>new Node();let saved=null;const win={matchMedia:()=>({matches:true}),navigator:{maxTouchPoints:1},requestAnimationFrame:fn=>{fn();return 1;},screen:{orientation}};const host={async requestFullscreen(){doc.fullscreenElement=host;}};mountNameKeyboard({inputs:[input],host,refresh(){},onSave:value=>saved=value.value,win,doc});return {input,ids,doc,get saved(){return saved;}};}
const next=()=>new Promise(resolve=>setImmediate(resolve));
test('touch fallback has a landscape Korean keyboard and saves without opening the native IME',async()=>{const h=keyboardHarness(undefined);let prevented=false;h.input.emit('pointerdown',{preventDefault(){prevented=true;}});await next();assert.ok(prevented);assert.equal(h.input.focuses,0);assert.equal(h.input.readOnly,true);assert.equal(h.ids['name-keyboard'].hidden,false);function key(char){for(const row of h.ids['name-keys'].children){const b=row.children.find(b=>b.textContent===char);if(b){b.onclick();return;}}throw Error('missing '+char);}for(const c of 'ㄱㅐㅁㅣ')key(c);assert.equal(h.ids['name-preview'].textContent,'개미');h.ids['name-done'].onclick();assert.equal(h.saved,'개미');assert.equal(h.ids['name-keyboard'].hidden,true);});
test('native field is focused only after a successful landscape lock',async()=>{let locked=false;const h=keyboardHarness({async lock(){locked=true;},addEventListener(){}});h.input.emit('pointerdown',{preventDefault(){}});await next();assert.ok(locked);assert.equal(h.input.focuses,1);assert.equal(h.input.readOnly,false);assert.equal(h.input.inputMode,'text');assert.equal(h.ids['name-keyboard'].hidden,true);});
