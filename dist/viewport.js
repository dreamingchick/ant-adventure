// Fit the logical landscape game to the visible viewport, not the overflowing
// document's innerWidth. The IME may resize the viewport without rotating it.
export function fitLandscape({width,height,offsetLeft=0,offsetTop=0,rotation=null}){
  width=Math.max(1,width);height=Math.max(1,height);
  const angle=rotation===null?(height>width?90:0):rotation;
  const scale=Math.min((angle?height:width)/1280,(angle?width:height)/720);
  return {width,height,left:offsetLeft,top:offsetTop,rotation:angle,scale,
    renderedWidth:(angle?720:1280)*scale,renderedHeight:(angle?1280:720)*scale};
}
export function mountViewport({host,stage,onResize=()=>{},win=window,doc=document}){
  let raf=0,settle=0,lockedRotation=null,lastLayout=null,stopped=false;
  const isEditing=()=>doc.activeElement?.matches?.('input,textarea,[contenteditable="true"]');
  function fit(){
    raf=0;if(stopped)return;
    const vv=win.visualViewport;
    const width=vv?.width||doc.documentElement.clientWidth||win.innerWidth;
    const height=vv?.height||doc.documentElement.clientHeight||win.innerHeight;
    const layout=fitLandscape({width,height,offsetLeft:vv?.offsetLeft||0,offsetTop:vv?.offsetTop||0,rotation:lockedRotation});
    Object.assign(host.style,{left:layout.left+'px',top:layout.top+'px',width:layout.width+'px',height:layout.height+'px'});
    stage.style.transform=`translate(-50%,-50%) rotate(${layout.rotation}deg) scale(${layout.scale})`;
    // Prevent focus zoom on scaled text fields; keep the visible font >=16px.
    stage.style.setProperty('--name-input-size',Math.max(16,16/layout.scale)+'px');
    stage.style.visibility='visible';
    if(lastLayout&&(lastLayout.scale!==layout.scale||lastLayout.rotation!==layout.rotation))onResize();
    lastLayout=layout;
  }
  function schedule(){if(!raf&&!stopped)raf=win.requestAnimationFrame(fit);}
  function beginEdit(event){if(!event.target.matches?.('input,textarea,[contenteditable="true"]'))return;win.clearTimeout(settle);lockedRotation=lastLayout?.rotation??fitLandscape({width:win.innerWidth,height:win.innerHeight}).rotation;schedule();}
  function endEdit(){win.clearTimeout(settle);settle=win.setTimeout(()=>{if(!isEditing())lockedRotation=null;schedule();},400);schedule();}
  const listeners=[[win,'resize',schedule],[win,'orientationchange',schedule],[win,'pageshow',schedule],[win,'load',schedule],[doc,'focusin',beginEdit],[doc,'focusout',endEdit]];
  if(win.visualViewport)listeners.push([win.visualViewport,'resize',schedule],[win.visualViewport,'scroll',schedule]);
  for(const [target,name,fn]of listeners)target.addEventListener(name,fn);
  // Apply before first paint, then remeasure after viewport and fonts settle.
  fit();schedule();doc.fonts?.ready.then(schedule);
  const retries=[win.setTimeout(schedule,100),win.setTimeout(schedule,350)];
  return {refresh:schedule,destroy(){stopped=true;for(const [target,name,fn]of listeners)target.removeEventListener(name,fn);win.cancelAnimationFrame(raf);win.clearTimeout(settle);for(const timer of retries)win.clearTimeout(timer);}};
}
