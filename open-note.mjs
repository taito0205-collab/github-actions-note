// open-note.js
import { chromium } from "playwright";

const statePath = "./note-state.json"; // あなたの Playwright state ファイル

(async () => {
  const browser = await chromium.launch({ headless: false }); // 👀 実際にブラウザ開く
  const context = await browser.newContext({ storageState: statePath });
  const page = await context.newPage();

  console.log("🌀 noteエディタにアクセス中...");
  await page.goto("https://editor.note.com/new", { waitUntil: "domcontentloaded" });

  console.log("✅ ログイン確認中（10秒間）...");
  await page.waitForTimeout(10000); // 10秒見せる
  await browser.close();
  console.log("🧩 完了：ブラウザを閉じました。");
})();


