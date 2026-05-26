# Meta Pixel 測試網站

**網址：** https://pixel-test-site-eight.vercel.app/

---

## 測試範圍

| 事件 | 類型 | 觸發條件 |
|---|---|---|
| `PageView` | 標準 | 頁面載入自動觸發 |
| `ViewContent` | 標準 | 頁面載入自動觸發 |
| `ClickCTA` | 自訂 | 點擊 CTA 按鈕 |
| `Lead` + `CompleteRegistration` | 標準 | 送出表單 |
| `StayTime` | 自訂 | 停留 15 / 30 / 60 秒 |
| `ScrollDepth` | 自訂 | 滾動到 25% / 50% / 75% / 90% |

---

## 如何測試

1. 安裝 **[Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)**（Chrome 擴充功能）
2. 開啟網址 https://pixel-test-site-eight.vercel.app/
3. 在頁面上操作（點按鈕、填表單、往下滾）
4. 右下角 **Debug 面板**即時顯示觸發的事件
5. Pixel Helper 圖示變綠代表 Pixel 有運作

**進階驗證：** Meta Events Manager → Test Events → 貼入網址 → 即時確認 Meta 伺服器收到的事件
