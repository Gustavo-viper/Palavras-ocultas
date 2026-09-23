/* PALAVRAS OCULTAS — FORGE STUDIOS v5 */
(function(){
"use strict";

var STORAGE_KEY="forge_wordsearch_v5";
var state={used:[],games:0,words:0,score:0,best:0};
var current=null;
var timer=null;
var seconds=0;
var selecting=false;
var selectionStart=null;
var selectionCells=[];

function $(id){return document.getElementById(id);}
function all(selector){return Array.prototype.slice.call(document.querySelectorAll(selector));}

function loadState(){
  try{
    var raw=window.localStorage ? localStorage.getItem(STORAGE_KEY) : null;
    if(raw){
      var s=JSON.parse(raw);
      if(s && typeof s==="object"){
        state.used=Array.isArray(s.used)?s.used:[];
        state.games=Number(s.games)||0;
        state.words=Number(s.words)||0;
        state.score=Number(s.score)||0;
        state.best=Number(s.best)||0;
      }
    }
  }catch(e){
    console.warn("Palavras Ocultas: armazenamento indisponível.",e);
  }
}

function saveState(){
  try{
    if(window.localStorage){
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    }
  }catch(e){
    console.warn("Palavras Ocultas: não foi possível salvar.",e);
  }
}

function showScreen(id){
  all(".screen").forEach(function(s){s.classList.remove("active");});
  var screen=$(id);
  if(screen) screen.classList.add("active");
}

function normalizeWord(value){
  return String(value||"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^A-Za-z]/g,"")
    .toUpperCase();
}

function shuffle(array){
  var a=array.slice();
  for(var i=a.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var t=a[i];a[i]=a[j];a[j]=t;
  }
  return a;
}

function getWordPool(){
  var source=window.FORGE_WORDS;
  if(!Array.isArray(source) || source.length===0) return [];

  var usable=source.filter(function(item){
    if(!item || !item.normalized) return false;
    var w=normalizeWord(item.normalized);
    return w.length>=3 && w.length<=9;
  });

  var fresh=usable.filter(function(item){
    return state.used.indexOf(normalizeWord(item.normalized))===-1;
  });

  if(fresh.length<10){
    state.used=[];
    saveState();
    fresh=usable.slice();
  }

  return fresh;
}

/* Places words deterministically enough that a playable board is always produced. */
function buildPuzzle(){
  var pool=getWordPool();
  if(pool.length<10) throw new Error("Banco de palavras insuficiente.");

  var chosen=shuffle(pool).slice(0,30);
  var size=13;
  var grid=[];
  var r,c;
  for(r=0;r<size;r++){
    grid[r]=[];
    for(c=0;c<size;c++) grid[r][c]="";
  }

  var directions=[
    [0,1],[1,0],[1,1],[1,-1],
    [0,-1],[-1,0],[-1,-1],[-1,1]
  ];

  var placed=[];

  for(var x=0;x<chosen.length && placed.length<10;x++){
    var item=chosen[x];
    var word=normalizeWord(item.word||item.normalized);
    var placedThis=false;

    for(var attempt=0;attempt<300 && !placedThis;attempt++){
      var d=directions[Math.floor(Math.random()*directions.length)];
      var rr=Math.floor(Math.random()*size);
      var cc=Math.floor(Math.random()*size);
      var endR=rr+d[0]*(word.length-1);
      var endC=cc+d[1]*(word.length-1);

      if(endR<0 || endR>=size || endC<0 || endC>=size) continue;

      var fits=true;
      for(var k=0;k<word.length;k++){
        var qr=rr+d[0]*k, qc=cc+d[1]*k;
        if(grid[qr][qc]!=="" && grid[qr][qc]!==word.charAt(k)){
          fits=false;break;
        }
      }
      if(!fits) continue;

      var cells=[];
      for(var n=0;n<word.length;n++){
        var pr=rr+d[0]*n, pc=cc+d[1]*n;
        grid[pr][pc]=word.charAt(n);
        cells.push([pr,pc]);
      }

      placed.push({
        word:word,
        display:String(item.word||word).toUpperCase(),
        normalized:normalizeWord(item.normalized||word),
        cells:cells,
        found:false
      });
      placedThis=true;
    }
  }

  if(placed.length<10){
    /* Very safe fallback: put short words on separate rows. */
    grid=[];
    for(r=0;r<size;r++){
      grid[r]=[];
      for(c=0;c<size;c++) grid[r][c]="";
    }
    placed=[];
    var fallback=pool.filter(function(item){
      return normalizeWord(item.normalized).length<=9;
    });
    fallback=shuffle(fallback);

    for(var f=0;f<fallback.length && placed.length<10;f++){
      var fw=normalizeWord(fallback[f].normalized);
      var row=placed.length;
      if(row>=size) break;
      for(c=0;c<fw.length;c++) grid[row][c]=fw.charAt(c);
      var fcells=[];
      for(c=0;c<fw.length;c++) fcells.push([row,c]);
      placed.push({
        word:fw,
        display:String(fallback[f].word||fw).toUpperCase(),
        normalized:fw,
        cells:fcells,
        found:false
      });
    }
  }

  if(placed.length<10) throw new Error("Não foi possível montar 10 palavras.");

  var letters="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for(r=0;r<size;r++){
    for(c=0;c<size;c++){
      if(!grid[r][c]){
        grid[r][c]=letters.charAt(Math.floor(Math.random()*letters.length));
      }
    }
  }

  return {grid:grid,placed:placed};
}

function renderPuzzle(){
  var gridEl=$("grid");
  var listEl=$("wordList");
  if(!gridEl || !listEl) throw new Error("Elementos do jogo não encontrados.");

  gridEl.innerHTML="";
  gridEl.style.gridTemplateColumns="repeat("+current.grid.length+",1fr)";

  current.grid.forEach(function(row,r){
    row.forEach(function(letter,c){
      var b=document.createElement("button");
      b.type="button";
      b.className="cell";
      b.textContent=letter;
      b.setAttribute("data-r",r);
      b.setAttribute("data-c",c);
      b.addEventListener("pointerdown",pointerDown);
      b.addEventListener("pointerenter",pointerEnter);
      gridEl.appendChild(b);
    });
  });

  listEl.innerHTML="";
  current.placed.forEach(function(item,i){
    var chip=document.createElement("span");
    chip.className="word-chip";
    chip.id="word-"+i;
    chip.textContent=item.display;
    listEl.appendChild(chip);
  });

  $("foundCount").textContent="0";
  $("totalCount").textContent=String(current.placed.length);
  $("score").textContent="0";
  $("timer").textContent="00:00";
  $("message").textContent="Encontre as palavras escondidas.";
}

function getCell(r,c){
  return document.querySelector('.cell[data-r="'+r+'"][data-c="'+c+'"]');
}

function pointCell(x,y){
  var el=document.elementFromPoint(x,y);
  while(el && el!==document.body){
    if(el.classList && el.classList.contains("cell")) return el;
    el=el.parentElement;
  }
  return null;
}

function lineFrom(start,end){
  if(!start || !end) return [];
  var dr=end[0]-start[0];
  var dc=end[1]-start[1];

  if(dr!==0 && dc!==0 && Math.abs(dr)!==Math.abs(dc)) return [];

  var sr=dr===0?0:(dr>0?1:-1);
  var sc=dc===0?0:(dc>0?1:-1);
  var count=Math.max(Math.abs(dr),Math.abs(dc))+1;
  var line=[];

  for(var i=0;i<count;i++){
    line.push([start[0]+sr*i,start[1]+sc*i]);
  }
  return line;
}

function paint(){
  all(".cell").forEach(function(c){c.classList.remove("selected");});
  selectionCells.forEach(function(p){
    var el=getCell(p[0],p[1]);
    if(el) el.classList.add("selected");
  });
}

function pointerDown(e){
  e.preventDefault();
  selecting=true;
  selectionStart=[
    Number(e.currentTarget.getAttribute("data-r")),
    Number(e.currentTarget.getAttribute("data-c"))
  ];
  selectionCells=selectionStart.slice(0,2).map(Number);
  selectionCells=[selectionStart];
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){}
  paint();
}

function pointerEnter(e){
  if(!selecting) return;
  var end=[
    Number(e.currentTarget.getAttribute("data-r")),
    Number(e.currentTarget.getAttribute("data-c"))
  ];
  var line=lineFrom(selectionStart,end);
  if(line.length){
    selectionCells=line;
    paint();
  }
}

function finishSelection(){
  if(!selecting) return;
  selecting=false;

  var selected=selectionCells.slice();
  var hitIndex=-1;

  for(var i=0;i<current.placed.length;i++){
    var item=current.placed[i];
    if(item.found || item.cells.length!==selected.length) continue;

    var forward=true, reverse=true;
    for(var j=0;j<item.cells.length;j++){
      if(item.cells[j][0]!==selected[j][0] || item.cells[j][1]!==selected[j][1]) forward=false;
      var rev=item.cells[item.cells.length-1-j];
      if(rev[0]!==selected[j][0] || rev[1]!==selected[j][1]) reverse=false;
    }
    if(forward || reverse){hitIndex=i;break;}
  }

  if(hitIndex>=0){
    var hit=current.placed[hitIndex];
    hit.found=true;
    hit.cells.forEach(function(p){
      var el=getCell(p[0],p[1]);
      if(el){el.classList.remove("selected");el.classList.add("found");}
    });

    var chip=$("word-"+hitIndex);
    if(chip) chip.classList.add("done");

    state.used.push(hit.normalized);
    state.words++;
    var gained=10+hit.word.length*2;
    state.score+=gained;
    $("score").textContent=String(state.score);
    $("foundCount").textContent=String(current.placed.filter(function(x){return x.found;}).length);
    saveState();

    if(current.placed.every(function(x){return x.found;})){
      state.games++;
      if(state.score>state.best) state.best=state.score;
      saveState();
      clearInterval(timer);
      $("message").textContent="🏆 Parabéns! Você encontrou todas as palavras!";
    }else{
      $("message").textContent="✅ "+hit.display+" encontrada!";
    }
  }else{
    $("message").textContent="🔎 Continue procurando...";
  }

  selectionCells=[];
  selectionStart=null;
  paint();
}

function startGame(){
  try{
    current=buildPuzzle();
    seconds=0;
    renderPuzzle();
    showScreen("game");

    clearInterval(timer);
    timer=setInterval(function(){
      seconds++;
      var min=String(Math.floor(seconds/60)).padStart(2,"0");
      var sec=String(seconds%60).padStart(2,"0");
      $("timer").textContent=min+":"+sec;
    },1000);
  }catch(error){
    console.error(error);
    showScreen("home");
    $("message").textContent="⚠️ Não foi possível montar a partida. Tente novamente.";
  }
}

function startDaily(){
  startGame();
}

function showStats(){
  $("statGames").textContent=String(state.games);
  $("statWords").textContent=String(state.words);
  $("statScore").textContent=String(state.score);
  $("statBest").textContent=String(state.best);
  showScreen("stats");
}

function goHome(){
  clearInterval(timer);
  showScreen("home");
}

function hint(){
  if(!current) return;
  var target=null;
  for(var i=0;i<current.placed.length;i++){
    if(!current.placed[i].found){target=current.placed[i];break;}
  }
  if(!target){
    $("message").textContent="🏆 Você já encontrou todas!";
    return;
  }

  target.cells.forEach(function(p){
    var el=getCell(p[0],p[1]);
    if(el) el.classList.add("hint");
  });

  $("message").textContent="💡 Dica: a próxima palavra foi destacada.";
  setTimeout(function(){
    target.cells.forEach(function(p){
      var el=getCell(p[0],p[1]);
      if(el && !el.classList.contains("found")) el.classList.remove("hint");
    });
  },1800);
}

function updateNetwork(){
  var status=$("networkStatus");
  if(!status) return;
  status.textContent=navigator.onLine?"● ONLINE":"● OFFLINE";
  status.style.color=navigator.onLine?"#4ee59a":"#ffb84e";
}

function bind(){
  loadState();

  var play=$("playButton");
  if(play) play.onclick=function(e){e.preventDefault();startGame();};

  var daily=$("dailyButton");
  if(daily) daily.onclick=function(e){e.preventDefault();startDaily();};

  var stats=$("statsButton");
  if(stats) stats.onclick=function(e){e.preventDefault();showStats();};

  all("[data-home]").forEach(function(b){
    b.onclick=function(e){e.preventDefault();goHome();};
  });

  var hintButton=$("hintBtn");
  if(hintButton) hintButton.onclick=function(e){e.preventDefault();hint();};

  document.addEventListener("pointerup",finishSelection);
  document.addEventListener("pointercancel",finishSelection);

  document.addEventListener("touchmove",function(e){
    if(!selecting) return;
    var t=e.touches[0];
    var el=pointCell(t.clientX,t.clientY);
    if(el){
      e.preventDefault();
      pointerEnter({currentTarget:el});
    }
  },{passive:false});

  window.addEventListener("online",updateNetwork);
  window.addEventListener("offline",updateNetwork);
  updateNetwork();
}

window.startGame=startGame;
window.startDaily=startDaily;
window.showStats=showStats;

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",bind);
}else{
  bind();
}

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(function(e){
    console.warn("Service Worker:",e);
  });
}
})();
