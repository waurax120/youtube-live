const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.ranking-panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.target).classList.add('active');
  });
});

// コメ稼ぎ判定の基本ルール
// ・小文字の半角 w は対象
// ・大文字の半角 W は対象外
// ・全角 W/w は別扱い
// ・単独の記号やURLなどは後のAPI/DB側で除外予定
function isCommentBaitCandidate(text) {
  const value = text.trim();

  if (!value) return false;
  if (/^W+$/.test(value)) return false; // 大文字Wだけは除外
  if (/^[w]+$/.test(value)) return true; // 小文字wは対象
  if (/^[!！?？.。]+$/.test(value)) return false;
  if (/^https?:\/\//i.test(value)) return false;

  return true;
}
