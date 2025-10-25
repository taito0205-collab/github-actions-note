import { chromium } from "playwright";

(async () => {
  console.log("🚀 起動中: Noteログイン用ブラウザを開きます…");

  // GUIブラウザを開く
  const browser = await chromium.launch({
    headless: false,
    args: ["--lang=ja-JP"]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("👉 Note にログインしてください。ログイン完了後、エディタ画面が開くまで待機します。");
  await page.goto("https://editor.note.com/new", { waitUntil: "domcontentloaded" });

  // 最大5分待機（ログイン操作を待つ）
  await page.waitForTimeout(300000);

  // セッションを保存
  await context.storageState({ path: "note-state.json" });
  console.log("✅ note-state.json を保存しました！");

  await browser.close();
})();
