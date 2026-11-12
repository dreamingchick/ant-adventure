import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {HAZARDS} from '../dist/stage2-engine.js';
const source=async f=>readFile(new URL('../dist/'+f,import.meta.url),'utf8');
test('ceiling sprite stays upright and path has solid support beneath hint dots',async()=>{
 const app=await source('app.js');
 assert.match(app,/Math\.abs\(Math\.sin\(q\.angle\)\)<\.4/);
 assert.match(app,/rotation=0;if\(p\.climb\)/);
 assert.doesNotMatch(app,/rotation=Math\.PI;/);
 assert.match(app,/Solid wooden\/fabric support FIRST/);
 assert.match(app,/ctx\.lineWidth=41;ctx\.stroke\(\)/);
});
test('chapter two HUD and controls use chapter one visual language',async()=>{
 const html=await source('stage2.html');
 for(const token of ['class="vitals"','class="chapter"','id="spit-fill"','class="attack"','class="jump"','class="move"'])assert.ok(html.includes(token),token);
 assert.match(html,/background:#23372edb/);
 assert.match(html,/rgba\(247,242,227,\.30\)/);
});
test('hazards start after opening safe run and stay on actual floor segments',()=>{
 const floors=[{x:0,w:950},{x:1110,w:1280},{x:2510,w:1150},{x:3830,w:1570}];
 assert.ok(HAZARDS[0].x>1110);
 for(const h of HAZARDS)assert.ok(floors.some(f=>h.x>=f.x&&h.x+h.w<=f.x+f.w),JSON.stringify(h));
});
