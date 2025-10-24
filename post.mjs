import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

(async () => {
  const { STATE_PATH, TITLE, START_URL, IS_PUBLIC, TAGS } = process.env;

  console.log('Navigating to:', START_URL);

  // --- Launch browser with Japanese locale ---
  const browser = await chromium.launch({
    headless: true,
    args: ['--lang=ja-JP'],
  });
  const context = await browser.newContext({
    storageState: STATE_PATH,
    locale: 'ja-JP',
  });
  const page = await context.newPage();

  await page.goto(START_URL, { waitUntil: 'networkidle' });
  console.log('Page loaded. Current URL:', page.url());

  // --- Wait for iframe or title area to appear ---
  await page.waitForFunction(() => {
    const iframes = document.querySelectorAll('iframe');
    const titleCandidates = document.querySelectorAll(
      'textarea[placeholder*="記事タイトル"], input[placeholder*="記事タイトル"], div[contenteditable="true"][data-placeholder*="記事タイトル"]'
    );
    return iframes.length > 0 || titleCandidates.length > 0;
  }, { timeout: 300000 }); // 5分待機

  // --- Retry loop (iframe対応) ---
  let frame = page.mainFrame();
  for (let i = 0; i < 10; i++) {
    console.log(`retry ${i + 1}/10 - waiting for editor DOM...`);
    for (const f of page.frames()) {
      const count = await f.locator('textarea[placeholder*="記事タイトル"]').count();
      if (count > 0) {
        frame = f;
        break;
      }
    }
    if (await frame.locator('textarea[placeholder*="記事タイトル"]').count()) break;
    await page.waitForTimeout(10000);
  }

  // --- Title field detection ---
  const titleBox = frame.locator(
    'textarea[placeholder*="記事タイトル"], input[placeholder*="記事タイトル"], div[contenteditable="true"][data-placeholder*="記事タイトル"]'
  ).first();

  try {
    await titleBox.waitFor({ state: 'visible', timeout: 120000 });
    await titleBox.click({ delay: 100 });
    await titleBox.fill(TITLE);
    console.log('✅ Title filled successfully');
  } catch (e) {
    const htmlPath = path.join(process.cwd(), 'title_debug.html');
    fs.writeFileSync(htmlPath, await page.content());
    console.error(`❌ タイトル欄が見つかりません。DOMを ${htmlPath} に保存しました（iframe対応版）`);
    throw e;
  }

  // --- Body area ---
  const preBody = fs.existsSync('final.json')
    ? JSON.parse(fs.readFileSync('final.json', 'utf8')).body || ''
    : '（本文データが存在しません）';
  const htmlAll = marked.parse(preBody, { gfm: true, breaks: false });

  const bodyBox = frame.locator('div[contenteditable="true"][role="textbox"]').first();
  await bodyBox.click();
  await page.keyboard.insertText(htmlAll);
  await page.waitForTimeout(500);

  // --- Save draft ---
  const saveBtn = frame.locator('button:has-text("下書き保存"), [aria-label*="下書き保存"]').first();
  await saveBtn.waitFor({ state: 'visible', timeout: 60000 });
  if (await saveBtn.isEnabled()) {
    await saveBtn.click();
    console.log('💾 下書きを保存しました');
  }

  await page.screenshot({ path: 'final_screenshot.png', fullPage: true });
  console.log('✅ 完了: draft saved');
  console.log('URL:', page.url());

  await browser.close();
})();
