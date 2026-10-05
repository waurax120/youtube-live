const STORAGE_KEY="liveStatsChannels";
const API_URL="https://script.google.com/macros/s/AKfycby5JLiPRL5-m6sclrDbbzq3s1lUxo_GUjEfau4Rr3drs4ibFx9M8fd7hqkKUMBxr68lDg/exec";

const defaultChannels=[{id:crypto.randomUUID(),youtubeId:"UCjFkp8GTHneW5pZd3nY-Kfg",name:"すりぴいダッグ",url:"https://www.youtube.com/@SuripiiDuck",status:"登録済み",subscribers:173000}];

function loadChannels(){try{const s=localStorage.getItem(STORAGE_KEY);if(s)return JSON.parse(s)}catch(e){console.warn(e)}localStorage.setItem(STORAGE_KEY,JSON.stringify(defaultChannels));return defaultChannels}
let channels=loadChannels();

const channelList=document.getElementById("channelList");
const liveList=document.getElementById("liveList");
const form=document.getElementById("channelForm");
const addButton=document.getElementById("addChannelButton");
const cancelButton=document.getElementById("cancelChannel");
const saveButton=document.getElementById("saveChannel");
const refreshButton=document.getElementById("refreshLiveButton");
const input=document.getElementById("channelInput");
const message=document.getElementById("formMessage");

function saveChannels(){localStorage.setItem(STORAGE_KEY,JSON.stringify(channels))}
function escapeHtml(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function getChannelInput(v){v=v.trim();if(/^UC[\w-]{20,}$/.test(v))return v;try{const u=new URL(v),p=u.pathname.split("/").filter(Boolean);if(p[0]?.startsWith("@"))return p[0];if(p[0]==="channel"&&p[1])return p[1]}catch(_){}return null}

function getYouTubeChannel(inputValue){
 return new Promise((resolve,reject)=>{
  const cb="youtubeCallback_"+Date.now()+"_"+Math.floor(Math.random()*10000);
  const s=document.createElement("script");
  const timer=setTimeout(()=>{cleanup();reject(new Error("YouTube APIへの接続がタイムアウトしました"))},15000);
  function cleanup(){clearTimeout(timer);delete window[cb];s.remove()}
  window[cb]=data=>{cleanup();if(data.error){reject(new Error(data.error));return}resolve(data)};
  s.onerror=()=>{cleanup();reject(new Error("YouTube APIに接続できませんでした"))};
  s.src=API_URL+"?channel="+encodeURIComponent(inputValue)+"&callback="+encodeURIComponent(cb);
  document.body.appendChild(s);
 })
}

function renderChannels(){
 channelList.innerHTML="";
 channels.forEach(c=>{
  const card=document.createElement("div");card.className="channel-card";
  const subs=c.subscribers?Number(c.subscribers).toLocaleString():"";
  card.innerHTML=`<div class="channel-info"><span class="status-dot">●</span><div><div class="channel-name">${escapeHtml(c.name)}</div><div class="channel-url">${escapeHtml(c.url||"")}</div>${subs?`<div class="channel-url">登録者 ${subs}人</div>`:""}</div></div><div class="channel-actions"><button class="icon-btn" data-id="${escapeHtml(c.id)}">🗑 削除</button></div>`;
  channelList.appendChild(card);
 });
 channelList.querySelectorAll(".icon-btn").forEach(b=>b.addEventListener("click",()=>{const id=b.dataset.id,t=channels.find(c=>c.id===id);if(t&&confirm(`「${t.name}」を登録チャンネルから削除しますか？`)){channels=channels.filter(c=>c.id!==id);saveChannels();renderChannels();refreshLive()}}))
}

function renderLiveCard(channel,live){
 const card=document.createElement("div");card.className="live-card";
 if(!live||!live.isLive){card.innerHTML=`<div class="channel-name">${escapeHtml(channel.name)}</div><div class="channel-url">現在LIVEしていません</div>`;return card}
 card.innerHTML=`<div class="live-head">${live.thumbnail?`<img class="live-thumb" src="${escapeHtml(live.thumbnail)}" alt="">`:""}<div><span class="live-badge">🔴 LIVE</span><h3 class="live-title">${escapeHtml(live.title)}</h3><div class="channel-url">${escapeHtml(channel.name)}</div><div class="live-meta"><span>👀 ${Number(live.concurrentViewers||0).toLocaleString()}人</span><span>💬 ${Number(live.commentCount||0).toLocaleString()}件</span><span>👍 ${Number(live.likeCount||0).toLocaleString()}件</span></div></div></div>`;
 return card
}

async function fetchLive(c){const inputValue=c.youtubeId||getChannelInput(c.url);if(!inputValue)return null;try{const data=await getYouTubeChannel(inputValue);return data.live||null}catch(e){console.warn(c.name,e);return null}}

async function refreshLive(){
 liveList.innerHTML='<div class="empty-card">LIVE情報を更新中…</div>';refreshButton.disabled=true;
 const cards=await Promise.all(channels.map(async c=>renderLiveCard(c,await fetchLive(c))));
 liveList.innerHTML="";if(!cards.length)liveList.innerHTML='<div class="empty-card">登録チャンネルがありません。</div>';else cards.forEach(c=>liveList.appendChild(c));refreshButton.disabled=false
}

function openForm(){form.classList.remove("hidden");input.value="";message.textContent="";input.focus()}
function closeForm(){form.classList.add("hidden");input.value="";message.textContent=""}
addButton.addEventListener("click",openForm);cancelButton.addEventListener("click",closeForm);

saveButton.addEventListener("click",async()=>{
 const url=input.value.trim(),ci=getChannelInput(url);
 if(!ci){message.textContent="YouTubeチャンネルURLまたはチャンネルIDを入力してください。";return}
 message.textContent="YouTubeからチャンネル情報を取得中…";saveButton.disabled=true;
 try{
  const data=await getYouTubeChannel(ci);
  if(channels.some(c=>c.youtubeId===data.channel.id)){message.textContent="このチャンネルはすでに登録されています。";saveButton.disabled=false;return}
  channels.push({id:crypto.randomUUID(),youtubeId:data.channel.id,name:data.channel.name,url,handle:data.channel.handle,thumbnail:data.channel.thumbnail,subscribers:data.channel.subscribers,views:data.channel.views,videos:data.channel.videos,status:"登録済み"});
  saveChannels();renderChannels();closeForm();await refreshLive();document.getElementById("channels").scrollIntoView({behavior:"smooth"})
 }catch(e){console.error(e);message.textContent="エラー: "+e.message}
 saveButton.disabled=false
});
input.addEventListener("keydown",e=>{if(e.key==="Enter")saveButton.click()});
refreshButton.addEventListener("click",refreshLive);

document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));document.querySelectorAll(".ranking-panel").forEach(p=>p.classList.remove("active"));tab.classList.add("active");document.getElementById(tab.dataset.target).classList.add("active")}));

renderChannels();
refreshLive();
