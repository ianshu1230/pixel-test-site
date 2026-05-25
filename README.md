# Meta Pixel 測試網站

用於測試 Meta Pixel 所有追蹤功能的 Next.js 網站，包含官方標準事件與自訂事件。

---

## 測試涵蓋範圍

| 事件 | 類型 | 觸發條件 |
|---|---|---|
| `PageView` | 標準 | 頁面載入（自動） |
| `ViewContent` | 標準 | 頁面載入 |
| `Contact` | 標準 | 點擊電話 / Email / LINE |
| `Lead` | 標準 | 送出聯絡表單 |
| `CompleteRegistration` | 標準 | 送出聯絡表單 |
| `Search` | 標準 | 點擊搜尋按鈕 |
| `ClickCTA` | 自訂 | 點擊任何 `.cta-button` 元素 |
| `ClickItem` | 自訂 | 點擊服務卡片（帶 `item_id`） |
| `StayTime` | 自訂 | 停留 15 / 30 / 60 秒（僅計算分頁可見時間） |
| `ScrollDepth` | 自訂 | 滾動到 25% / 50% / 75% / 90% |
| `FilterChange` | 自訂 | 改變篩選下拉選單 |

畫面右下角有即時 Debug 面板，會顯示每個事件的名稱、類型、參數與觸發時間。

---

## 本地開發

### 1. 安裝依賴

```bash
yarn install
```

### 2. 設定環境變數

複製 `.env.local`，填入你的設定：

```bash
# Meta Pixel ID（已預設為你現有的 Pixel）
NEXT_PUBLIC_PIXEL_ID=2129809201199924

# Neon 資料庫連線字串（選填，不填則表單仍能觸發 Pixel，但資料不會儲存）
DATABASE_URL=postgresql://user:password@host/dbname
```

### 3. 啟動開發伺服器

```bash
yarn dev
```

開啟 [http://localhost:3000](http://localhost:3000)

### 4. 驗證 Pixel

- 安裝 **Meta Pixel Helper** Chrome 擴充功能
- 開啟 DevTools → Console，確認 `typeof window.fbq === 'function'`
- 觀察右下角 Debug 面板的事件記錄

---

## 部署到 Vercel

### 步驟一：建立 Vercel 專案

1. 前往 [vercel.com](https://vercel.com) → **Add New Project**
2. 選擇這個 GitHub repo：`ianshu1230/pixel-test-site`
3. Framework 選 **Next.js**，其他保持預設
4. 點擊 **Deploy**

### 步驟二：設定環境變數

在 Vercel 專案 → **Settings → Environment Variables** 加入：

| 名稱 | 值 |
|---|---|
| `NEXT_PUBLIC_PIXEL_ID` | `2129809201199924` |
| `DATABASE_URL` | （下一步加入 Neon 後會自動填入） |

### 步驟三：加入 Neon 資料庫（選填）

用於儲存聯絡表單資料：

1. Vercel 專案 → **Storage → Create Database → Neon**
2. 建立後 `DATABASE_URL` 會自動注入到環境變數
3. 重新部署，表單送出後資料會存入 `submissions` 資料表

如果不需要儲存表單資料，可以跳過此步驟——Pixel 事件仍然會正常觸發。

---

## 專案結構

```
pixel-test-site/
├── app/
│   ├── layout.tsx          # Meta Pixel base code 載入
│   ├── page.tsx            # 所有測試功能的主頁面（Client Component）
│   ├── globals.css         # 全域樣式
│   └── api/
│       └── contact/
│           └── route.ts    # 表單送出 API（POST → 存入 Neon）
├── lib/
│   └── db.ts               # Neon SQL helper
├── .env.local              # 本地環境變數（不會上傳 GitHub）
└── next.config.ts
```

---

## SQL 資料表結構

表單資料會存入 `submissions` 資料表（第一次送出時自動建立）：

```sql
CREATE TABLE submissions (
  id           SERIAL PRIMARY KEY,
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  service_type TEXT        NOT NULL,
  message      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```
