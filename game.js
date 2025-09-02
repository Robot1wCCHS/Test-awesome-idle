(() => {
  const fmt = (n) => {
    if (n >= 1e12) return (n/1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n/1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n/1e3).toFixed(2) + 'K';
    return Math.floor(n).toString();
  };
  const now = () => Date.now();

  const el = id => document.getElementById(id);
  const resourceValueEl = el('resource-value');
  const resourceRateEl = el('resource-rate');
  const clickBtn = el('click-btn');
  const upgradesEl = el('upgrades');
  const storeEl = el('store');
  const achievementsEl = el('achievements');
  const prestigeBtn = el('prestige-btn');
  const prestigeInfo = el('prestige-info');
  const lastSaveEl = el('last-save');
  const toastWrap = el('toast-wrap');
  const exportBtn = el('export-btn');
  const importBtn = el('import-btn');
  const resetBtn = el('reset-btn');

  let state = {
    resource: 0,
    lastTick: now(),
    perSecond: 0,
    clickValue: 1,
    upgrades: [],
    store: [],
    achievements: [],
    prestige: 0,
    prestigeMult: 1,
    runtimeTicks: 0,
    lastSaveTime: null
  };

  const defaultUpgrades = [
    { id: 'auto-1', name: 'Generator I', desc: 'Adds production per second', baseCost: 15, level: 0, baseValue: 0.5 },
    { id: 'auto-2', name: 'Generator II', desc: 'Stronger generator', baseCost: 150, level: 0, baseValue: 6 },
    { id: 'click-1', name: 'Reinforced Click', desc: 'Increases click value', baseCost: 50, level: 0, baseValue: 1 }
  ];

  const defaultStore = [
    { id: 'mult-1', name: 'Production x2', desc: 'Double production permanently', cost: 1000, bought: false, effect(){ state.prestigeMult *= 2; } }
  ];

  const defaultAchievements = [
    { id:'ach-1', name:'First Tap', desc:'Tap once', condition:(s)=>s.runtimeTicks>0 && s.resource>=1, unlocked:false },
    { id:'ach-2', name:'Collector', desc:'Reach 1000 resources', condition:(s)=>s.resource>=1000, unlocked:false }
  ];

  const SAVE_KEY = 'awesome_idle_save';

  function saveGame() {
    state.lastSaveTime = new Date().toISOString();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    lastSaveEl.textContent = new Date(state.lastSaveTime).toLocaleString();
  }
  function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    state = Object.assign(state, JSON.parse(raw));
    state.upgrades = state.upgrades || defaultUpgrades.map(u=>({...u}));
    state.store = state.store || defaultStore.map(s=>({...s}));
    state.achievements = state.achievements || defaultAchievements.map(a=>({...a}));
    if (state.lastSaveTime) lastSaveEl.textContent = new Date(state.lastSaveTime).toLocaleString();
    return true;
  }

  function showToast(text,duration=2000){
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    toastWrap.appendChild(el);
    setTimeout(()=>el.remove(), duration);
  }

  function calcPerSecond(){
    let base=0;
    for (const u of state.upgrades) base += u.level*u.baseValue;
    base*=state.prestigeMult;
    state.perSecond=base;
  }

  function buyUpgrade(id){
    const u=state.upgrades.find(x=>x.id===id);
    const cost=Math.floor(u.baseCost*Math.pow(1.15,u.level));
    if (state.resource<cost){showToast("Not enough");return;}
    state.resource-=cost;u.level++;calcPerSecond();showToast(`${u.name} → lvl ${u.level}`);
  }
  function buyStoreItem(id){
    const item=state.store.find(x=>x.id===id);
    if(!item||item.bought||state.resource<item.cost)return;
    state.resource-=item.cost;item.bought=true;item.effect();calcPerSecond();showToast(`Bought ${item.name}`);
  }
  function doPrestige(){
    const req=10000*Math.pow(3,state.prestige);
    if(state.resource<req){showToast(`Need ${fmt(req)}`);return;}
    state.prestige++;state.prestigeMult*=1.5;state.resource=0;
    state.upgrades=defaultUpgrades.map(u=>({...u}));
    state.store=defaultStore.map(s=>({...s}));
    state.achievements=defaultAchievements.map(a=>({...a}));
    calcPerSecond();showToast(`Prestige ${state.prestige}`);
  }
  function checkAchievements(){
    for(const a of state.achievements){
      if(!a.unlocked && a.condition(state)){a.unlocked=true;showToast(`Achievement: ${a.name}`);}
    }
  }

  function renderUpgrades(){
    upgradesEl.innerHTML='';
    for(const u of state.upgrades){
      const cost=Math.floor(u.baseCost*Math.pow(1.15,u.level));
      const d=document.createElement('div');
      d.className='upgrade card';
      d.innerHTML=`<div class="title"><strong>${u.name}</strong><span>${fmt(cost)}</span></div>
      <div class="desc">${u.desc} — lvl ${u.level}</div>
      <button>Buy</button>`;
      d.querySelector('button').onclick=()=>{buyUpgrade(u.id);renderUI();saveGame();};
      upgradesEl.appendChild(d);
    }
  }
  function renderStore(){
    storeEl.innerHTML='';
    for(const s of state.store){
      const d=document.createElement('div');
      d.className='store-item';
      d.innerHTML=`<div><strong>${s.name}</strong><div class="desc">${s.desc}</div></div>
      <div><div>${fmt(s.cost)}</div><button ${s.bought?'disabled':''}>${s.bought?'Owned':'Buy'}</button></div>`;
      d.querySelector('button').onclick=()=>{buyStoreItem(s.id);renderUI();saveGame();};
      storeEl.appendChild(d);
    }
  }
  function renderAchievements(){
    achievementsEl.innerHTML='';
    for(const a of state.achievements){
      const li=document.createElement('li');
      li.textContent=`${a.unlocked?'🏆':'🔒'} ${a.name} — ${a.desc}`;
      achievementsEl.appendChild(li);
    }
  }
  function renderUI(){
    resourceValueEl.textContent=fmt(state.resource);
    resourceRateEl.textContent=fmt(state.perSecond)+' / sec';
    prestigeInfo.textContent=`Prestige: ${state.prestige} (x${state.prestigeMult.toFixed(2)})`;
    renderUpgrades();renderStore();renderAchievements();
  }

  function tick(){
    const dt=(now()-state.lastTick)/1000;state.lastTick=now();
    state.resource+=state.perSecond*dt;state.runtimeTicks++;
    checkAchievements();renderUI();
  }

  clickBtn.onclick=()=>{state.resource+=state.clickValue*state.prestigeMult;renderUI();};

  prestigeBtn.onclick=()=>{doPrestige();renderUI();saveGame();};
  resetBtn.onclick=()=>{if(confirm("Reset?")){localStorage.removeItem(SAVE_KEY);location.reload();}};
  exportBtn.onclick=()=>{navigator.clipboard.writeText(btoa(JSON.stringify(state)));showToast("Exported!");};
  importBtn.onclick=()=>{const s=prompt("Paste save:");if(s){state=JSON.parse(atob(s));renderUI();saveGame();}};

  function init(){
    state.upgrades=defaultUpgrades.map(u=>({...u}));
    state.store=defaultStore.map(s=>({...s}));
    state.achievements=defaultAchievements.map(a=>({...a}));
    calcPerSecond();
    loadGame();
    renderUI();
    state.lastTick=now();
    setInterval(tick,500);
    setInterval(saveGame,5000);
  }
  init();
})();
