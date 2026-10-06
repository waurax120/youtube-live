const STORAGE_KEY="liveStatsChannels";
const API_URL="https://script.google.com/macros/s/AKfycbwcIRwYLwx1WhaKjOWRs10oxJRD7jFK8A3GyXNpIWzx6dc7MNk4vBLhZgjJaAoOZ-D2ng/exec";

// 初期状態ではチャンネルを1件も登録しません。
// 以前のバージョンで自動登録された「すりぴいダッグ」も初回更新時に削除します。
function loadChannels(){
  try{
    const s=localStorage.getItem(STORAGE_KEY);
    if(s){
      let saved=JSON.parse(s);
      const migrationKey="removedDefaultChannelV2";
      if(!localStorage.getItem(migrationKey)){
        saved=saved.filter(c=>c.youtubeId!=="UCjFkp8GTHneW5pZd3nY-Kfg");
        localStorage.setItem(migrationKey,"1");
        localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));
      }
      return saved;
    }
  }catch(e){console.warn(e)}
  return [];
}
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
const chatList=document.getElementById("chatList");
const chatStatus=document.getElementById("chatStatus");
const chatRefreshButton=document.getElementById("chatRefreshButton");
let chatTimer=null;
let chatState={liveChatId:"",pageToken:"",running:false,seenIds:new Set(),channelName:""};

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

function formatElapsed(startTime){
 const start=Date.parse(startTime||"");
 if(!Number.isFinite(start)) return "—";
 const diff=Math.max(0,Date.now()-start);
 const totalSeconds=Math.floor(diff/1000);
 const h=Math.floor(totalSeconds/3600);
 const m=Math.floor((totalSeconds%3600)/60);
 const sec=totalSeconds%60;
 return h>0
   ? `${h}時間${String(m).padStart(2,"0")}分${String(sec).padStart(2,"0")}秒`
   : `${m}分${String(sec).padStart(2,"0")}秒`;
}

function renderLiveCard(channel,live){
 const card=document.createElement("div");
 card.className="live-card";
 const liveStart=live ? (live.actualStartTime || live.publishedAt || live.scheduledStartTime || "") : "";
 if(live&&live.isLive&&liveStart) card.dataset.actualStartTime=liveStart;
 if(!live||!live.isLive){
   card.innerHTML=`<div class="channel-name">${escapeHtml(channel.name)}</div><div class="channel-url">現在LIVEしていません</div>`;
   return card;
 }
 card.innerHTML=`
   <div class="live-head">
     ${live.thumbnail?`<img class="live-thumb" src="${escapeHtml(live.thumbnail)}" alt="">`:""}
     <div>
       <span class="live-badge">🔴 LIVE中</span>
       <h3 class="live-title">${escapeHtml(live.title)}</h3>
       <div class="channel-url">${escapeHtml(channel.name)}</div>
       <div class="live-meta">
         <span>👀 ${Number(live.concurrentViewers||0).toLocaleString()}人</span>
         <span>💬 ${Number(live.commentCount||0).toLocaleString()}件</span>
         <span>👍 ${Number(live.likeCount||0).toLocaleString()}件</span>
         <span>⏱️ ${formatElapsed(liveStart)}</span>
       </div>
     </div>
   </div>`;
 return card;
}


function getChat(liveChatId,pageToken=""){
 return new Promise((resolve,reject)=>{
  const cb="chatCallback_"+Date.now()+"_"+Math.floor(Math.random()*10000);
  const s=document.createElement("script");
  const timer=setTimeout(()=>{cleanup();reject(new Error("LIVEチャットの取得がタイムアウトしました"))},15000);
  function cleanup(){clearTimeout(timer);delete window[cb];s.remove()}
  window[cb]=data=>{cleanup();if(data.error||data.success===false){reject(new Error(data.error||"LIVEチャットを取得できませんでした"));return}resolve(data)};
  s.onerror=()=>{cleanup();reject(new Error("LIVEチャットAPIに接続できませんでした"))};
  let src=API_URL+"?action=chat&liveChatId="+encodeURIComponent(liveChatId)+"&callback="+encodeURIComponent(cb);
  if(pageToken)src+="&pageToken="+encodeURIComponent(pageToken);
  s.src=src;document.body.appendChild(s);
 });
}
function renderChatMessage(msg){
 const row=document.createElement("div");row.className="chat-message";row.dataset.messageId=msg.id||"";
 const avatar=msg.profileImageUrl?`<img src="${escapeHtml(msg.profileImageUrl)}" alt="" class="chat-avatar">`:`<div class="chat-avatar chat-avatar-empty">👤</div>`;
 const badges=[msg.isChatOwner?"配信者":"",msg.isChatModerator?"モデ":"",""].filter(Boolean);
 const badgeHtml=badges.map(b=>`<span class="chat-badge">${escapeHtml(b)}</span>`).join("");
 const superHtml=msg.superChat?`<span class="superchat-badge">💰 ${escapeHtml(msg.superChat.amountDisplayString||"Super Chat")}</span>`:"";
 row.innerHTML=`${avatar}<div class="chat-body"><div class="chat-author"><strong>${escapeHtml(msg.displayName||"不明なユーザー")}</strong>${badgeHtml}${superHtml}</div><div class="chat-text">${escapeHtml(msg.text||"")}</div></div>`;
 return row;
}
function appendChatMessages(items){
 if(!items||!items.length)return;
 const fragment=document.createDocumentFragment();
 items.forEach(msg=>{if(!msg.id||chatState.seenIds.has(msg.id))return;chatState.seenIds.add(msg.id);fragment.appendChild(renderChatMessage(msg));});
 chatList.appendChild(fragment);
 while(chatList.children.length>300)chatList.removeChild(chatList.firstChild);
 chatList.scrollTop=chatList.scrollHeight;
}
function stopChat(reason="停止中"){
 if(chatTimer)clearTimeout(chatTimer);chatTimer=null;chatState.running=false;chatState.liveChatId="";chatState.pageToken="";chatStatus.textContent=reason;chatStatus.classList.remove("chat-status-live");
}
async function pollChat(){
 if(!chatState.running||!chatState.liveChatId)return;
 try{
  const data=await getChat(chatState.liveChatId,chatState.pageToken);
  appendChatMessages(data.items||[]);
  chatState.pageToken=data.nextPageToken||chatState.pageToken;
  if(data.offlineAt){stopChat("LIVE終了");return}
  chatStatus.textContent="🟢 取得中";chatStatus.classList.add("chat-status-live");
  chatTimer=setTimeout(pollChat,Math.max(1000,Number(data.pollingIntervalMillis||5000)));
 }catch(e){
  console.warn(e);chatStatus.textContent="⚠️ "+e.message;chatStatus.classList.remove("chat-status-live");
  if(chatState.running)chatTimer=setTimeout(pollChat,5000);
 }
}
async function startChatForLive(channel,live){
 if(!live||!live.isLive||!live.liveChatId){stopChat("チャットなし");chatList.innerHTML='<div class="empty-card">現在LIVE中ではないか、LIVEチャットを取得できません。</div>';return}
 if(chatTimer)clearTimeout(chatTimer);
 chatState={liveChatId:live.liveChatId,pageToken:"",running:true,seenIds:new Set(),channelName:channel.name};
 chatList.innerHTML="";chatStatus.textContent="🟡 接続中…";chatStatus.classList.remove("chat-status-live");await pollChat();
}
async function refreshChat(){
 const liveChannels=[];
 for(const c of channels){try{const data=await getYouTubeChannel(c.youtubeId||getChannelInput(c.url));if(data.live&&data.live.isLive)liveChannels.push({channel:c,live:data.live});}catch(e){console.warn(c.name,e)}}
 if(liveChannels.length)await startChatForLive(liveChannels[0].channel,liveChannels[0].live);
 else{stopChat("停止中");chatList.innerHTML='<div class="empty-card">登録チャンネルで現在LIVE中の配信がありません。</div>'}
}

async function fetchLive(c){const inputValue=c.youtubeId||getChannelInput(c.url);if(!inputValue)return null;try{const data=await getYouTubeChannel(inputValue);return data.live||null}catch(e){console.warn(c.name,e);return null}}

async function refreshLive(){
 liveList.innerHTML='<div class="empty-card">LIVE情報を更新中…</div>';refreshButton.disabled=true;
 const liveResults=await Promise.all(channels.map(async c=>({channel:c,live:await fetchLive(c)})));
 liveList.innerHTML="";
 if(!liveResults.length)liveList.innerHTML='<div class="empty-card">登録チャンネルがありません。</div>';
 else liveResults.forEach(x=>liveList.appendChild(renderLiveCard(x.channel,x.live)));
 refreshButton.disabled=false;
 const firstLive=liveResults.find(x=>x.live&&x.live.isLive&&x.live.liveChatId);
 if(firstLive)await startChatForLive(firstLive.channel,firstLive.live);
 else{stopChat("停止中");chatList.innerHTML='<div class="empty-card">登録チャンネルで現在LIVE中の配信がありません。</div>'}
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
// LIVE判定・視聴者数などを自動更新
setInterval(refreshLive, 30000);

// 経過時間だけは1秒ごとに画面を更新
setInterval(()=>{
 document.querySelectorAll(".live-card").forEach(card=>{
   const badge=card.querySelector(".live-badge");
   if(!badge || !badge.textContent.includes("LIVE中")) return;
   const meta=card.querySelector(".live-meta");
   if(!meta) return;
   const spans=meta.querySelectorAll("span");
   if(!spans.length) return;
   // APIから取得した開始時刻をdata属性に保存しているカードだけ更新
   const start=card.dataset.actualStartTime;
   if(start){
     spans[spans.length-1].textContent="⏱️ "+formatElapsed(start);
   }
 });
},1000);


chatRefreshButton.addEventListener("click",refreshChat);

document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));document.querySelectorAll(".ranking-panel").forEach(p=>p.classList.remove("active"));tab.classList.add("active");document.getElementById(tab.dataset.target).classList.add("active")}));

renderChannels();
refreshLive();
