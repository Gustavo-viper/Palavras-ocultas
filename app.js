const KEY="forge_wordsearch_v1";
const state=JSON.parse(localStorage.getItem(KEY)||'{"used":[],"games":0,"words":0,"score":0,"best":0}');
let current=null,timerId=null,seconds=0,selection=[],isSelecting=false;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function show(id){$$(".screen").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active")}
function norm(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z]/gi,"").toUpperCase()}
function shuffled(a){return a.slice().sort(()=>Math.random()-.5)}
function availableWords(){
  let a=window.FORGE_WORDS.filter(x=>!state.used.includes(x.normalized));
  if(a.length<40){state.used=[];save();a=window.FORGE_WORDS}
  return a;
}
const dirs=[[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
function makePuzzle(words){
  const size=13, grid=Array.from({length:size},()=>Array(size).fill(""));
  const placed=[];
  for(const item of shuffled(words)){
    const w=norm(item.word); let ok=false;
    for(let attempt=0;attempt<250&&!ok;attempt++){
      const d=dirs[Math.floor(Math.random()*dirs.length)];
      const r=Math.floor(Math.random()*size), c=Math.floor(Math.random()*size);
      const er=r+d[0]*(w.length-1), ec=c+d[1]*(w.length-1);
      if(er<0||er>=size||ec<0||ec>=size) continue;
      let good=true;
      for(let i=0;i<w.length;i++){const rr=r+d[0]*i,cc=c+d[1]*i;if(grid[rr][cc]&&grid[rr][cc]!==w[i]){good=false;break}}
      if(!good) continue;
      for(let i=0;i<w.length;i++)grid[r+d[0]*i][c+d[1]*i]=w[i];
      placed.push({...item,word:w,cells:Array.from({length:w.length},(_,i)=>[r+d[0]*i,c+d[1]*i])});
      ok=true;
    }
  }
  const letters="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(!grid[r][c])grid[r][c]=letters[Math.floor(Math.random()*letters.length)];
  return {grid,placed};
}
function renderPuzzle(){
 const g=$("#grid"); g.style.gridTemplateColumns=`repeat(${current.grid.length},1fr)`; g.innerHTML="";
 current.grid.forEach((row,r)=>row.forEach((ch,c)=>{const b=document.createElement("button");b.className="cell";b.textContent=ch;b.dataset.r=r;b.dataset.c=c;b.addEventListener("pointerdown",startSelect);b.addEventListener("pointerenter",moveSelect);b.addEventListener("pointerup",endSelect);g.appendChild(b)}));
 $("#wordList").innerHTML=current.placed.map((x,i)=>`<span class="word-chip" id="word-${i}">${x.word}</span>`).join("");
 $("#foundCount").textContent=0;$("#totalCount").textContent=current.placed.length;$("#score").textContent=0;
}
function cell(r,c){return document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`)}

function getCellFromPoint(clientX, clientY){
  const el = document.elementFromPoint(clientX, clientY);
  if(!el) return null;
  return el.closest?.(".cell") || null;
}

function buildLine(startPoint,endPoint){
  if(!startPoint || !endPoint) return [];
  const dr=endPoint[0]-startPoint[0];
  const dc=endPoint[1]-startPoint[1];

  // Only horizontal, vertical or diagonal selections are accepted.
  if(dr!==0 && dc!==0 && Math.abs(dr)!==Math.abs(dc)) return [];

  const sr=Math.sign(dr), sc=Math.sign(dc);
  const length=Math.max(Math.abs(dr),Math.abs(dc))+1;

  return Array.from({length},(_,i)=>[
    startPoint[0]+sr*i,
    startPoint[1]+sc*i
  ]);
}

function setSelectionEnd(r,c){
  const startPoint=selection[0];
  if(!startPoint) return;
  const line=buildLine(startPoint,[r,c]);
  if(line.length) selection=line;
  paintSelection();
}

function startSelect(e){
  e.preventDefault();
  const target=e.currentTarget;
  const r=Number(target.dataset.r);
  const c=Number(target.dataset.c);

  isSelecting=true;
  selection=[[r,c]];

  try{
    target.setPointerCapture?.(e.pointerId);
  }catch(_){}

  paintSelection();
}

function moveSelect(e){
  if(!isSelecting) return;

  const target=getCellFromPoint(e.clientX,e.clientY);
  if(!target) return;

  setSelectionEnd(
    Number(target.dataset.r),
    Number(target.dataset.c)
  );
}

function finishSelection(){
  if(!isSelecting) return;
  isSelecting=false;

  const selected=selection.slice();

  const sameLine=(a,b)=>a.length===b.length &&
    a.every((p,i)=>p[0]===b[i][0] && p[1]===b[i][1]);

  const reversed=(a,b)=>a.length===b.length &&
    a.every((p,i)=>{
      const q=b[b.length-1-i];
      return p[0]===q[0] && p[1]===q[1];
    });

  const hit=current?.placed?.find(x=>
    !x.found &&
    (sameLine(selected,x.cells) || reversed(selected,x.cells))
  );

  if(hit){
    hit.found=true;

    hit.cells.forEach(([r,c])=>{
      cell(r,c)?.classList.remove("selected");
      cell(r,c)?.classList.add("found");
    });

    const i=current.placed.indexOf(hit);
    document.getElementById("word-"+i)?.classList.add("done");

    state.used.push(hit.normalized);
    state.words++;

    const gained=10+hit.word.length*2;
    state.score+=gained;

    document.getElementById("score").textContent=state.score;
    document.getElementById("foundCount").textContent=
      current.placed.filter(x=>x.found).length;

    save();

    if(current.placed.every(x=>x.found)){
      state.games++;
      state.best=Math.max(state.best,state.score);
      save();
      document.getElementById("message").textContent=
        "🏆 Parabéns! Você encontrou todas as palavras!";
      clearInterval(timerId);
    }else{
      document.getElementById("message").textContent=
        `✅ ${hit.word} encontrada!`;
      setTimeout(()=>{
        if(document.getElementById("message"))
          document.getElementById("message").textContent="";
      },1200);
    }
  }else{
    document.getElementById("message").textContent=
      "🔎 Essa seleção não corresponde a uma palavra.";
    setTimeout(()=>{
      if(document.getElementById("message"))
        document.getElementById("message").textContent="";
    },900);
  }

  selection=[];
  paintSelection();
}

function paintSelection(){
  $$(".cell").forEach(x=>x.classList.remove("selected"));

  selection.forEach(([r,c])=>{
    cell(r,c)?.classList.add("selected");
  });
}

// Pointer events: work with mouse, touch and stylus.
document.addEventListener("pointermove",moveSelect,{passive:false});
document.addEventListener("pointerup",finishSelection);
document.addEventListener("pointercancel",finishSelection);

// Fallback for touch browsers that do not keep pointer events.
document.addEventListener("touchmove",e=>{
  if(!isSelecting) return;
  const t=e.touches[0];
  const target=getCellFromPoint(t.clientX,t.clientY);
  if(target){
    e.preventDefault();
    setSelectionEnd(
      Number(target.dataset.r),
      Number(target.dataset.c)
    );
  }
},{passive:false});

document.addEventListener("touchend",finishSelection,{passive:true});

function startGame(){
  try{
    if(!window.FORGE_WORDS || !Array.isArray(window.FORGE_WORDS) || !window.FORGE_WORDS.length){
      throw new Error("Banco de palavras não carregado.");
    }

    const pool=availableWords();
    const chosen=shuffled(pool).slice(0,10);

    if(chosen.length<10){
      throw new Error("Não foi possível montar a partida.");
    }

    current=makePuzzle(chosen);

    if(!current || !current.placed || current.placed.length===0){
      throw new Error("Não foi possível criar o caça-palavras.");
    }

    seconds=0;
    renderPuzzle();
    $("#message").textContent="Encontre as 10 palavras escondidas.";
    show("game");

    clearInterval(timerId);
    timerId=setInterval(()=>{
      seconds++;
      $("#timer").textContent=
        `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
    },1000);
  }catch(error){
    console.error("Erro ao iniciar jogo:",error);
    alert("Não foi possível iniciar o jogo. Recarregue a página e tente novamente.");
  }
}
function daily(){const d=new Date().toISOString().slice(0,10);let seed=0;for(const ch of d)seed=(seed*31+ch.charCodeAt(0))>>>0;const pool=window.FORGE_WORDS.slice(seed%window.FORGE_WORDS.length);current=makePuzzle(pool.slice(0,10));seconds=0;renderPuzzle();show("game");clearInterval(timerId);timerId=setInterval(()=>{seconds++;$("#timer").textContent=`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`},1000)}
function hint(){if(!current)return;const target=current.placed.find(x=>!x.found);if(!target){$("#message").textContent="Você já encontrou tudo!";return}target.cells.forEach(([r,c])=>cell(r,c)?.classList.add("hint"));$("#message").textContent=`💡 Dica: a palavra "${target.word}" está destacada no tabuleiro.`;setTimeout(()=>target.cells.forEach(([r,c])=>cell(r,c)?.classList.remove("hint")),1800)}
function stats(){ $("#statGames").textContent=state.games;$("#statWords").textContent=state.words;$("#statScore").textContent=state.score;$("#statBest").textContent=state.best;show("stats")}
function bindUI(){
  var startButtons = document.querySelectorAll("[data-start]");
  for(var i=0;i<startButtons.length;i++){
    startButtons[i].addEventListener("click",function(e){
      e.preventDefault();
      startGame();
    });
  }

  var dailyButtons = document.querySelectorAll("[data-daily]");
  for(var j=0;j<dailyButtons.length;j++){
    dailyButtons[j].addEventListener("click",function(e){
      e.preventDefault();
      daily();
    });
  }

  var statsButtons = document.querySelectorAll("[data-stats]");
  for(var k=0;k<statsButtons.length;k++){
    statsButtons[k].addEventListener("click",function(e){
      e.preventDefault();
      stats();
    });
  }

  var homeButtons = document.querySelectorAll("[data-home]");
  for(var h=0;h<homeButtons.length;h++){
    homeButtons[h].addEventListener("click",function(e){
      e.preventDefault();
      clearInterval(timerId);
      show("home");
    });
  }

  var hintButton=document.getElementById("hintBtn");
  if(hintButton) hintButton.addEventListener("click",hint);
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",bindUI);
}else{
  bindUI();
}
function network(){const on=navigator.onLine;$("#networkStatus").textContent=on?"● ONLINE":"● OFFLINE";$("#networkStatus").style.color=on?"#4ee59a":"#ffb84e"}addEventListener("online",network);addEventListener("offline",network);network();
if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(console.error);
