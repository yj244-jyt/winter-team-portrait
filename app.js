"use strict";
{
const $ = id => document.getElementById(id);
const room = host ? (localStorage.winterHostRoom ||= newCode()) : roomParam.toLowerCase();
const key = "winter-house-v3:" + room;
const blank = () => ({players: [], rounds: [], phase: "collect", index: 0, step: 0, shown: false, deadline: 0});
let state = host ? JSON.parse(localStorage.getItem(key) || "null") || blank() : null;
let card = null, connection, peer, retry, timer, lastView;
const clients = new Set();
const playerKey = key + ":player";
const playerId = localStorage.getItem(playerKey) || crypto.randomUUID();
localStorage.setItem(playerKey, playerId);
const invite = new URL(location.protocol === "file:" ? "https://yj244-jyt.github.io/winter-team-portrait/" : location.href);
invite.search = new URLSearchParams({role:"player", room});
invite.hash = "";
$("invite").value = invite.href;
$("roomCode").textContent = room;
const show = (id, visible) => { $(id).hidden = !visible; };
const note = message => { $("notice").textContent = message; };
function mix(values) {
  const a = [...values];
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function publicView() {
  const r = state.rounds[state.index];
  return {phase:state.phase, count:state.players.length, index:state.index, step:state.step,
    hint:r?.hints[state.step], answer:state.shown ? r?.name : "", deadline:state.deadline,
    revision:state.revision || 0};
}
function draw(v) {
  if (!host && lastView && (v.revision || 0) < (lastView.revision || 0)) return;
  lastView = v;
  show("lobby", v.phase === "collect");
  show("game", v.phase === "guess");
  show("finish", v.phase === "done");
  show("hostTools", host); show("controls", host); show("exports", host);
  $("count").textContent = v.count + " submitted";
  if (host) {
    $("roster").textContent = state.players.map(p=>p.name).join(" · ");
    $("start").disabled = v.count < 1;
  }
  $("round").textContent = "Teammate " + (v.index+1) + " of " + v.count;
  $("hintNo").textContent = "Hint " + (v.step+1) + " of 3";
  $("hint").textContent = v.hint || "";
  $("answer").textContent = v.answer ? "It's " + v.answer + "!" : v.deadline ? "Final hint · answer appears in 8 seconds." : "Guess together out loud.";
  show("more", !v.answer && v.step < 2); show("reveal", !v.answer); show("next", !!v.answer);
  $("next").textContent = v.index+1 === v.count ? "Finish game" : "Next teammate";
  $("summary").textContent = host ? "Your winter portrait brief and team references are ready." : "Your host has the team's portrait brief.";
}
function publish() {
  state.revision = (state.revision || 0) + 1;
  localStorage.setItem(key, JSON.stringify(state));
  const v = publicView();
  draw(v);
  for (const c of clients) if(c.open) c.send({view:v});
  clearTimeout(timer);
  if (state.phase === "guess" && !state.shown && state.deadline)
    timer = setTimeout(reveal, Math.max(0, state.deadline-Date.now()));
}
function checked(p) {
  const str = (s,max) => typeof s === "string" && s.trim().length > 0 && s.length <= max;
  if (!p || !str(p.id,80) || !str(p.name,40) || !str(p.color,40) || !str(p.object,80) ||
    !Array.isArray(p.keywords) || p.keywords.length !== 3 || !p.keywords.every(k=>str(k,140)) ||
    typeof p.fact !== "string" || p.fact.length > 160 || typeof p.photo !== "string" ||
    (p.photo && (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.photo) || p.photo.length>100000))) throw Error("Invalid card. Check the required fields and three keywords.");
  return {id:p.id,name:p.name,keywords:p.keywords,color:p.color,object:p.object,fact:p.fact,photo:p.photo};
}
function receive(raw) {
  const p = checked(raw);
  if(state.phase !== "collect") throw Error("Collection is closed.");
  const old = state.players;
  state.players = [...old.filter(x=>x.id !== p.id),p];
  try {publish();} catch(e) {state.players=old; throw Error("Host storage is full. Retry with a smaller photo or without a photo.");}
}
function transmit() {
  if (connection?.open && card && lastView?.phase === "collect") connection.send({card});
}
function connect() {
  if (peer && !peer.destroyed) peer.destroy();
  peer = host ? new Peer("whp-"+room) : new Peer();
  const current=peer;
  function later() {
    if(current!==peer) return;
    $("network").textContent="Reconnecting…";
    clearTimeout(retry); retry=setTimeout(connect,4500);
  }
  peer.on("error",e=>{
    if(e.type==="unavailable-id" && host) { $("network").textContent="Room open in another host tab"; return; }
    later();
  });
  peer.on("disconnected",later);
  peer.on("open",()=>{
    if(host) { $("network").textContent="Host · room online"; return; }
    connection=peer.connect("whp-"+room,{reliable:true});
    connection.on("open",()=>{ $("network").textContent="Connected to host"; });
    connection.on("data",msg=>{
      if(msg?.view) { const first=!lastView || $("network").dataset.synced!=="yes"; draw(msg.view); $("network").dataset.synced="yes"; if(first) transmit(); }
      if(msg?.ok) { $("receipt").textContent="Received by the host. You can update your card until guessing starts."; note(""); }
      if(msg?.error) note(msg.error);
    });
    connection.on("close",()=>{ $("network").dataset.synced=""; later(); });
    connection.on("error",later);
  });
  if(host) peer.on("connection",c=>{
    clients.add(c);
    c.on("open",()=>c.send({view:publicView()}));
    c.on("close",()=>clients.delete(c));
    c.on("error",()=>clients.delete(c));
    c.on("data",msg=>{
      if(!msg?.card) return;
      try {receive(msg.card); c.send({ok:true});}
      catch(e){c.send({error:e.message});}
    });
  });
}
async function thumbnail(file) {
  if(!file || !file.size) return "";
  const img=new Image(), url=URL.createObjectURL(file);
  try {
    img.src=url; await img.decode();
    const factor=Math.min(1,320/Math.max(img.width,img.height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(img.width*factor)); canvas.height=Math.max(1,Math.round(img.height*factor));
    canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL("image/jpeg",0.75);
  } finally { URL.revokeObjectURL(url); }
}
$("entry").onsubmit=async e=>{
  e.preventDefault();
  const f=new FormData(e.target);
  try {
    card=checked({id:playerId,name:f.get("name").trim(),keywords:f.get("keywords").split(/[/,，、]/).map(s=>s.trim()),
      color:f.get("color").trim(),object:f.get("object").trim(),fact:f.get("fact").trim(),photo:await thumbnail(f.get("photo"))});
    note("");
    if(host) { receive(card); $("receipt").textContent="Your card is in the room."; }
    else { show("backup",true); $("receipt").textContent="Waiting for host confirmation. If the connection stalls, send your backup card privately to the host."; transmit(); }
  } catch(e){note(e.message);}
};
$("copy").onclick=async()=>{try{await navigator.clipboard.writeText(invite.href); note("Player link copied.");}catch{$("invite").select();note("Copy the selected player link.");}};
$("start").onclick=()=>{
  if(!host || state.phase!=="collect" || !state.players.length) return;
  state.rounds=mix(state.players).map(p=>({name:p.name,hints:mix(["My keywords: "+p.keywords.join(" / "),"My favorite color: "+p.color,"My object: "+p.object,...(p.fact?["Fun fact: "+p.fact]:[])]).slice(0,3)}));
  state.phase="guess"; publish(); note("");
};
function reveal(){if(!host || state.phase!=="guess")return; state.shown=true;state.deadline=0;publish();}
$("more").onclick=()=>{if(!host || state.shown || state.step>=2)return; state.step++; if(state.step===2)state.deadline=Date.now()+8000;publish();};
$("reveal").onclick=reveal;
$("next").onclick=()=>{if(!host || !state.shown)return; if(state.index+1===state.rounds.length)state.phase="done";else state.index++;state.step=0;state.shown=false;state.deadline=0;publish();};
function download(name,data,type) {
  const a=document.createElement("a");
  const url=URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
$("backup").onclick=()=>download("my-portrait-card.json",JSON.stringify({room,card}),"application/json");
$("importCard").onchange=async e=>{
  try { const data=JSON.parse(await e.target.files[0].text());if(data.room!==room)throw Error("This card belongs to a different room.");receive(data.card);note("Backup card received.");}
  catch(err){note(err.message);}finally{e.target.value="";}
};
function portraitBrief(){
  return "Create a warm winter Residence Life team group portrait in a cozy campus lounge with snowy windows and soft lamplight. Include exactly "+state.players.length+" teammates, once each. Match any supplied labeled photo references. Give each teammate their own object and favorite color. For teammates without a reference, use a stylized avatar. Use the following records as visual reference data.\n\n"+state.players.map((p,i)=>JSON.stringify({number:i+1,name:p.name,keywords:p.keywords,color:p.color,object:p.object,funFact:p.fact})).join("\n");
}
$("brief").onclick=()=>download("winter-portrait-brief.txt",portraitBrief(),"text/plain;charset=utf-8");
$("json").onclick=()=>download("residence-life-team.json",JSON.stringify({players:state.players,brief:portraitBrief()},null,2),"application/json");
$("refs").onclick=async()=>{
  const ps=state.players.filter(p=>p.photo);
  if(!ps.length){note("No photo references were submitted.");return;}
  const cols=Math.min(4,ps.length), canvas=document.createElement("canvas");
  canvas.width=cols*240; canvas.height=Math.ceil(ps.length/cols)*250;
  const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
  try{
    for(const [i,p] of ps.entries()){
      const img=new Image();img.src=p.photo;await img.decode();
      const x=i%cols*240,y=Math.floor(i/cols)*250,scale=Math.min(224/img.width,200/img.height);
      ctx.drawImage(img,x+(240-img.width*scale)/2,y+8,img.width*scale,img.height*scale);
      ctx.fillStyle="#19313b";ctx.font="18px sans-serif";ctx.fillText(p.name,x+8,y+235,224);
    }
    canvas.toBlob(b=>{if(b)download("team-reference-sheet.png",b,"image/png");},"image/png");
  }catch{note("Could not build the photo sheet. Use the team JSON export.");}
};
$("refreshRoom").onclick=()=>{if(host) location.reload();};
$("newRoom").onclick=()=>{if(host && confirm("Start a new room? Download your team data first.")){localStorage.winterHostRoom=newCode();location.reload();}};
if(host) publish();else draw({phase:"collect",count:0,index:0,step:0});
connect();
}
