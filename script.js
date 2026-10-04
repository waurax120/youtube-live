// ================================
// LIVE STATS - YouTube API接続版
// ================================

const STORAGE_KEY = "liveStatsChannels";

// ★ここにApps ScriptのWebアプリURLを入れる
const API_URL = "https://script.google.com/macros/s/AKfycby5JLiPRL5-m6sclrDbbzq3s1lUxo_GUjEfau4Rr3drs4ibFx9M8fd7hqkKUMBxr68lDg/exec";


// ================================
// 初期チャンネル
// ================================

const defaultChannels = [
  {
    id: crypto.randomUUID(),
    name: "すりぴいダッグ",
    url: "https://www.youtube.com/@SuripiiDuck",
    status: "登録済み"
  }
];


// ================================
// チャンネルデータ
// ================================

function loadChannels() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      return JSON.parse(saved);
    }

  } catch (e) {
    console.warn("チャンネルデータの読み込みに失敗:", e);
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(defaultChannels)
  );

  return defaultChannels;
}

let channels = loadChannels();


// ================================
// HTML要素
// ================================

const channelList = document.getElementById("channelList");
const form = document.getElementById("channelForm");
const addButton = document.getElementById("addChannelButton");
const cancelButton = document.getElementById("cancelChannel");
const saveButton = document.getElementById("saveChannel");
const input = document.getElementById("channelInput");
const message = document.getElementById("formMessage");


// ================================
// 保存
// ================================

function saveChannels() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(channels)
  );
}


// ================================
// HTML安全化
// ================================

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ================================
// YouTube URLから情報を取り出す
// ================================

function getChannelInput(url) {

  url = url.trim();

  // チャンネルID
  if (/^UC[\w-]{20,}$/.test(url)) {
    return url;
  }

  try {
    const u = new URL(url);

    const parts = u.pathname
      .split("/")
      .filter(Boolean);

    // @ハンドル
    if (parts[0] && parts[0].startsWith("@")) {
      return parts[0];
    }

    // /channel/UCxxxx
    if (
      parts[0] === "channel" &&
      parts[1]
    ) {
      return parts[1];
    }

  } catch (e) {}

  return null;
}


// ================================
// YouTube APIからチャンネル取得
// ================================

function getYouTubeChannel(inputValue) {

  return new Promise((resolve, reject) => {

    const callbackName =
      "youtubeCallback_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 10000);

    const script =
      document.createElement("script");

    const timeout =
      setTimeout(() => {

        cleanup();

        reject(
          new Error(
            "YouTube APIへの接続がタイムアウトしました"
          )
        );

      }, 15000);


    function cleanup() {

      clearTimeout(timeout);

      delete window[callbackName];

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }


    window[callbackName] = function(data) {

      cleanup();

      if (data.error) {
        reject(
          new Error(data.error)
        );
        return;
      }

      resolve(data);
    };


    script.onerror = function() {

      cleanup();

      reject(
        new Error(
          "YouTube APIに接続できませんでした"
        )
      );
    };


    script.src =
      API_URL +
      "?channel=" +
      encodeURIComponent(inputValue) +
      "&callback=" +
      encodeURIComponent(callbackName);


    document.body.appendChild(script);
  });
}


// ================================
// チャンネル表示
// ================================

function renderChannels() {

  channelList.innerHTML = "";

  channels.forEach(channel => {

    const card =
      document.createElement("div");

    card.className =
      "channel-card";


    const safeName =
      escapeHtml(channel.name);


    const safeUrl =
      escapeHtml(
        channel.url || ""
      );


    const subscribers =
      channel.subscribers
        ? Number(
            channel.subscribers
          ).toLocaleString()
        : "";


    card.innerHTML = `

      <div class="channel-info">

        <span class="status-dot">●</span>

        <div>

          <div class="channel-name">
            ${safeName}
          </div>

          <div class="channel-url">
            ${safeUrl}
          </div>

          ${
            subscribers
              ? `
                <div class="channel-url">
                  登録者 ${subscribers}人
                </div>
              `
              : ""
          }

        </div>

      </div>


      <div class="channel-actions">

        <button
          class="icon-btn"
          data-action="remove"
          data-id="${channel.id}"
        >
          🗑 削除
        </button>

      </div>
    `;


    channelList.appendChild(card);
  });


  // 削除ボタン

  channelList
    .querySelectorAll(
      '[data-action="remove"]'
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset.id;

          const target =
            channels.find(
              c => c.id === id
            );

          if (!target) return;


          if (
            confirm(
              `「${target.name}」を登録チャンネルから削除しますか？`
            )
          ) {

            channels =
              channels.filter(
                c => c.id !== id
              );

            saveChannels();

            renderChannels();
          }

        }
      );
    });
}


// ================================
// フォーム
// ================================

function openForm() {

  form.classList.remove(
    "hidden"
  );

  input.value = "";

  message.textContent = "";

  input.focus();
}


function closeForm() {

  form.classList.add(
    "hidden"
  );

  input.value = "";

  message.textContent = "";
}


addButton.addEventListener(
  "click",
  openForm
);


cancelButton.addEventListener(
  "click",
  closeForm
);


// ================================
// チャンネル追加
// ================================

saveButton.addEventListener(
  "click",
  async () => {

    const url =
      input.value.trim();


    if (!url) {

      message.textContent =
        "チャンネルURLを入力してください。";

      return;
    }


    const channelInput =
      getChannelInput(url);


    if (!channelInput) {

      message.textContent =
        "YouTubeチャンネルURLまたはチャンネルIDを入力してください。";

      return;
    }


    // 読み込み中

    message.textContent =
      "YouTubeからチャンネル情報を取得中...";


    saveButton.disabled = true;


    try {

      const data =
        await getYouTubeChannel(
          channelInput
        );


      // 同じチャンネルが登録済みか確認

      const alreadyExists =
        channels.some(
          channel =>
            channel.youtubeId === data.id
        );


      if (alreadyExists) {

        message.textContent =
          "このチャンネルはすでに登録されています。";

        saveButton.disabled = false;

        return;
      }


      // 新しいチャンネル追加

      channels.push({

        id: crypto.randomUUID(),

        youtubeId: data.id,

        name: data.name,

        url: url,

        handle: data.handle,

        thumbnail: data.thumbnail,

        subscribers: data.subscribers,

        views: data.views,

        videos: data.videos,

        status: "登録済み"

      });


      saveChannels();

      renderChannels();

      closeForm();


      document
        .getElementById("channels")
        .scrollIntoView({
          behavior: "smooth"
        });


    } catch (error) {

      console.error(error);

      message.textContent =
        "エラー: " +
        error.message;

    }


    saveButton.disabled = false;

  }
);


// Enterキー

input.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      saveButton.click();

    }

  }
);


// ================================
// ランキングタブ
// ================================

const tabs =
  document.querySelectorAll(
    ".tab"
  );

const panels =
  document.querySelectorAll(
    ".ranking-panel"
  );


tabs.forEach(tab => {

  tab.addEventListener(
    "click",
    () => {

      tabs.forEach(t =>
        t.classList.remove(
          "active"
        )
      );

      panels.forEach(p =>
        p.classList.remove(
          "active"
        )
      );


      tab.classList.add(
        "active"
      );


      document
        .getElementById(
          tab.dataset.target
        )
        .classList.add(
          "active"
        );

    }
  );

});


// ================================
// コメ稼ぎ判定
// ================================

function isCommentBaitCandidate(text) {

  const value =
    text.trim();


  if (!value) {
    return false;
  }


  // 大文字Wは除外

  if (/^W+$/.test(value)) {
    return false;
  }


  // 小文字wは対象

  if (/^w+$/.test(value)) {
    return true;
  }


  // 記号だけは除外

  if (
    /^[!！?？.。]+$/.test(value)
  ) {
    return false;
  }


  // URLは除外

  if (
    /^https?:\/\//i.test(value)
  ) {
    return false;
  }


  return true;
}


// ================================
// 初期表示
// ================================

renderChannels();
