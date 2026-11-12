function cameFromArcade() {
  let entered=new URLSearchParams(location.search).get('from')==='garu-arcade';
  try { entered=entered || Boolean(document.referrer && new URL(document.referrer).origin==='https://garu-arcade-hub.snugbrink3.chatgpt.site'); } catch {}
  try { if(entered)sessionStorage.setItem('garu-arcade-entry','1');return entered || sessionStorage.getItem('garu-arcade-entry')==='1'; } catch {return entered;}
}
export function initPwa(){
  const button=document.querySelector('#install-app'),update=document.querySelector('#update-app'),guide=document.querySelector('#install-guide'),instructions=document.querySelector('#install-instructions'),status=document.querySelector('#install-status');
  const fromArcade=true;
  let deferred=null,registration=null,updating=false;update.hidden=true;
  const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const reflect=()=>{if(fromArcade){button.textContent='← 대문 홈으로';button.disabled=false;button.setAttribute('aria-label','가루 오락실 대문 홈으로 돌아가기');return;}button.textContent=standalone()?'설치된 앱 ✓':'앱 설치 ↓';button.disabled=standalone();};reflect();
  function showGuide(){instructions.textContent=/iPad|iPhone|iPod/.test(navigator.userAgent)?'Safari에서 공유 버튼 → 홈 화면에 추가 → 추가를 선택하세요.':'Android: Chrome의 오른쪽 위 ⋮ 메뉴 → 앱 설치 또는 홈 화면에 추가를 선택하세요. PC: 주소창의 설치 아이콘이나 브라우저 메뉴에서 앱 설치를 선택하세요. 인앱 브라우저에서는 Chrome으로 열어 주세요.';guide.hidden=false;}
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();if(fromArcade)return;deferred=event;button.textContent='앱 설치 ↓';});
  window.addEventListener('appinstalled',()=>{if(fromArcade)return;deferred=null;button.textContent='설치 완료 ✓';button.disabled=true;guide.hidden=true;});
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change',reflect);
  button.addEventListener('click',async()=>{if(fromArcade){window.location.assign('https://garu-arcade-hub.snugbrink3.chatgpt.site/');return;}if(deferred){const prompt=deferred;deferred=null;try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted'){button.textContent='설치 진행 중…';return;}}catch{} }showGuide();});
  document.querySelector('#install-close').onclick=()=>{guide.hidden=true;};
  function waiting(){update.hidden=!registration?.waiting;}
  update.onclick=()=>{if(!registration?.waiting){update.hidden=true;return;}updating=true;update.disabled=true;update.textContent='업데이트 중…';registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});};
  if('serviceWorker'in navigator){navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updating)location.reload();});navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(reg=>{registration=reg;waiting();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')waiting();});});}).catch(()=>{status.textContent='설치 준비를 마치지 못했어요. 연결을 확인하고 새로고침해 주세요.';});}
}
