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
function startSelect(e){e.preventDefault();isSelecting=true;selection=[[+e.currentTarget.dataset.r,+e.currentTarget.dataset.c]];paintSelection()}
function moveSelect(e){if(!isSelecting)return;const p=[+e.currentTarget.dataset.r,+e.currentTarget.dataset.c];const s=selection[0];const dr=p[0]-s[0],dc=p[1]-s[1];if(dr===0||dc===0||Math.abs(dr)===Math.abs(dc)){const sr=Math.sign(dr),sc=Math.sign(dc),n=Math.max(Math.abs(dr),Math.abs(dc));selection=Array.from({length:n+1},(_,i)=>[s[0]+sr*i,s[1]+sc*i]);paintSelection()}}
function paintSelection(){$$(".cell").forEach(x=>x.classList.remove("selected"));selection.forEach(([r,c])=>cell(r,c)?.classList.add("selected"))}
function endSelect(){if(!isSelecting)return;isSelecting=false;const found=current.placed.find((x,i)=>!x.found&&x.cells.length===selection.length&&x.cells.every((p,j)=>p[0]===selection[j][0]&&p[1]===selection[j][1]));const reverse=current.placed.find((x,i)=>!x.found&&x.cells.length===selection.length&&x.cells.every((p,j)=>p[0]===selection[selection.length-1-j][0]&&p[1]===selection[selection.length-1-j][1]));const hit=found||reverse;if(hit){hit.found=true;hit.cells.forEach(([r,c])=>cell(r,c)?.classList.add("found"));const i=current.placed.indexOf(hit);$("#word-"+i).classList.add("done");state.used.push(hit.normalized);state.words++;const gained=10+hit.word.length*2;state.score+=gained;$("#score").textContent=state.score;$("#foundCount").textContent=current.placed.filter(x=>x.found).length;save();if(current.placed.every(x=>x.found)){state.games++;state.best=Math.max(state.best,state.score);save();$("#message").textContent="🏆 Parabéns! Você encontrou todas as palavras!";clearInterval(timerId)}}else{$("#message").textContent="Continue procurando…";setTimeout(()=>$("#message").textContent="",800)}selection=[];paintSelection()}
document.addEventListener("pointerup",()=>{if(isSelecting)endSelect()});
function startGame(){const pool=availableWords();const chosen=shuffled(pool).slice(0,10);current=makePuzzle(chosen);seconds=0;renderPuzzle();$("#message").textContent="Encontre as 10 palavras escondidas.";show("game");clearInterval(timerId);timerId=setInterval(()=>{seconds++;$("#timer").textContent=`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`},1000)}
function daily(){const d=new Date().toISOString().slice(0,10);let seed=0;for(const ch of d)seed=(seed*31+ch.charCodeAt(0))>>>0;const pool=window.FORGE_WORDS.slice(seed%window.FORGE_WORDS.length);current=makePuzzle(pool.slice(0,10));seconds=0;renderPuzzle();show("game");clearInterval(timerId);timerId=setInterval(()=>{seconds++;$("#timer").textContent=`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`},1000)}
function hint(){if(!current)return;const target=current.placed.find(x=>!x.found);if(!target){$("#message").textContent="Você já encontrou tudo!";return}target.cells.forEach(([r,c])=>cell(r,c)?.classList.add("hint"));$("#message").textContent=`💡 Dica: a palavra "${target.word}" está destacada no tabuleiro.`;setTimeout(()=>target.cells.forEach(([r,c])=>cell(r,c)?.classList.remove("hint")),1800)}
function stats(){ $("#statGames").textContent=state.games;$("#statWords").textContent=state.words;$("#statScore").textContent=state.score;$("#statBest").textContent=state.best;show("stats")}
$$("[data-start]").forEach(x=>x.onclick=startGame);$$("[data-daily]").forEach(x=>x.onclick=daily);$$("[data-stats]").forEach(x=>x.onclick=stats);$$("[data-home]").forEach(x=>x.onclick=()=>{clearInterval(timerId);show("home")});$("#hintBtn").onclick=hint;
function network(){const on=navigator.onLine;$("#networkStatus").textContent=on?"● ONLINE":"● OFFLINE";$("#networkStatus").style.color=on?"#4ee59a":"#ffb84e"}addEventListener("online",network);addEventListener("offline",network);network();
if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(console.error);
