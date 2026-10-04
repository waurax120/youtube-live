// ================================
// LIVE STATS - チャンネル管理
// ================================

const STORAGE_KEY = "liveStatsChannels";

const defaultChannels = [
  { id: crypto.randomUUID(), name: "すりぴいダッグ", url: "", status: "登録済み" },
  { id: crypto.randomUUID(), name: "○○○○", url: "", status: "登録済み" },
  { id: crypto.randomUUID(), name: "△△△△", url: "", status: "登録済み" }
];

function loadChannels() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn("チャンネルデータの読み込みに失敗:", e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultChannels));
  return defaultChannels;
}

let channels = loadChannels();

const channelList = document.getElementById("channelList");
const form = document.getElementById("channelForm");
const addButton = document.getElementById("addChannelButton");
const cancelButton = document.getElementById("cancelChannel");
const saveButton = document.getElementById("saveChannel");
const input = document.getElementById("channelInput");
const message = document.getElementById("formMessage");

function saveChannels() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayNameFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0]?.startsWith("@")) return parts[0].slice(1);
    if (parts[0]) return parts[0];
  } catch (_) {}
  return "新しいチャンネル";
}

function renderChannels() {
  channelList.innerHTML = "";

  channels.forEach(channel => {
    const card = document.createElement("div");
    card.className = "channel-card";

    const safeName = escapeHtml(channel.name);
    const safeUrl = escapeHtml(channel.url || "YouTube API接続後にチャンネル情報を取得");

    card.innerHTML = `
      <div class="channel-info">
        <span class="status-dot">●</span>
        <div>
          <div class="channel-name">${safeName}</div>
          <div class="channel-url">${safeUrl}</div>
        </div>
      </div>
      <div class="channel-actions">
        <button class="icon-btn" data-action="remove" data-id="${channel.id}">🗑 削除</button>
      </div>
    `;

    channelList.appendChild(card);
  });

  channelList.querySelectorAll('[data-action="remove"]').forEach(button => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const target = channels.find(c => c.id === id);
      if (!target) return;

      if (confirm(`「${target.name}」を登録チャンネルから削除しますか？`)) {
        channels = channels.filter(c => c.id !== id);
        saveChannels();
        renderChannels();
      }
    });
  });
}

function openForm() {
  form.classList.remove("hidden");
  input.value = "";
  message.textContent = "";
  input.focus();
}

function closeForm() {
  form.classList.add("hidden");
  input.value = "";
  message.textContent = "";
}

addButton.addEventListener("click", openForm);
cancelButton.addEventListener("click", closeForm);

saveButton.addEventListener("click", () => {
  const url = input.value.trim();

  if (!url) {
    message.textContent = "チャンネルURLを入力してください。";
    return;
  }

  const looksLikeYoutube =
    url.includes("youtube.com/") ||
    url.includes("youtu.be/") ||
    /^UC[\w-]{20,}$/.test(url);

  if (!looksLikeYoutube) {
    message.textContent = "YouTubeチャンネルURLまたはチャンネルIDを入力してください。";
    return;
  }

  const name = displayNameFromUrl(url);
  channels.push({
    id: crypto.randomUUID(),
    name,
    url,
    status: "登録済み"
  });

  saveChannels();
  renderChannels();
  closeForm();
  document.getElementById("channels").scrollIntoView({ behavior: "smooth" });
});

input.addEventListener("keydown", event => {
  if (event.key === "Enter") saveButton.click();
});

renderChannels();

// ================================
// ランキングタブ
// ================================

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".ranking-panel");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    panels.forEach(p => p.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.target).classList.add("active");
  });
});

// ================================
// コメ稼ぎ判定の基本ルール
// ================================
// ・半角小文字 w / ww / www... は対象
// ・半角大文字 W / WW / WWW... は対象外
// ・「w系」は将来的にまとめて集計可能
// ・単独の記号やURLは除外
function isCommentBaitCandidate(text) {
  const value = text.trim();

  if (!value) return false;

  // 大文字Wだけのコメントは除外
  if (/^W+$/.test(value)) return false;

  // 小文字wだけのコメントは対象
  if (/^w+$/.test(value)) return true;

  // 記号だけは除外
  if (/^[!！?？.。]+$/.test(value)) return false;

  // URLは除外
  if (/^https?:\/\//i.test(value)) return false;

  return true;
}
