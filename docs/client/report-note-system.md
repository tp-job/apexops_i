## Note 系統與 Word 風格編輯器報告

### 1. 系統概觀

- **目的**：提供使用者一個接近 Microsoft Word 體驗的線上筆記空間，同時保留原本 ApexNotes 的標籤、釘選、統計等功能。
- **前端技術棧**：React + Vite + Tailwind v4（`lightswind`）、TipTap（ProseMirror）作為富文字核心。
- **後端技術棧**：Node.js / Express 5、Prisma、PostgreSQL，`/api/notes` 負責筆記 CRUD 與統計。

### 2. 前端架構（Client）

- `NoteDashboard`
  - 顯示所有筆記（含釘選區與一般區）。
  - 使用 `note/utils` 中的 `fetchNotes`、`toggleNotePin`、`deleteNote` 等 API。
  - 提供快速建立文字筆記的 composer。
- `NoteEditor`
  - 單筆筆記的編輯與「Word-like」工作區。
  - 主要依賴：
    - `useEditor`（TipTap）管理內容狀態。
    - `useNoteAutosave` 負責自動儲存。
    - `fetchNoteById`、`createNote`、`updateNote` 與後端同步。
- `note/utils`
  - `noteApi.ts`：封裝 `/api/notes` HTTP 呼叫。
  - `noteAutosave.ts`：根據 `title` 與 `content` 範圍 debounce 後自動送出 PATCH。
  - `noteTypes.ts`：定義 `Note` 與區塊模型（目前仍以 HTML 為主）。

### 3. 新版 NoteEditor：Word 風格工作區

- **編輯核心**
  - 由原本 `contentEditable + document.execCommand` 改為 TipTap：
    - Extensions：`StarterKit`、`Underline`、`TextAlign`、`TextStyle`、`Color`、`Highlight`、`Link`、`Image`、`Table`（含 Row/Header/Cell）。
    - `onUpdate` 時使用 `editor.getHTML()` 同步到 `note.content`，以維持與舊版 API 相容。
    - 字數統計透過 `editor.getText()` 計算。

- **Ribbon（工具列）**
  - 上方模擬 Word Home Tab：
    - Undo / Redo。
    - Font 群組：粗體、斜體、底線。
    - Paragraph 群組：項目符號、編號清單、左右/置中對齊。
  - 未來可在同一區塊擴充：
    - 字型家族 / 字級選單。
    - 行距、縮排、段落前後距。
    - Insert Tab：插入圖片、超連結、表格等。

- **Page Canvas（紙張畫布）**
  - 以 A4 尺寸為基準（約 `816 x 1056` px），置中顯示並加上陰影與頁首列。
  - 背景使用柔和灰階（light/dark 模式皆有），營造「文件在桌面上」的感覺。
  - 內容區透過 `<EditorContent>` 渲染，四周留有邊界空白模擬 Word 版面。

- **Status Bar（狀態列）**
  - 置於編輯器底部，模擬 Word 狀態列：
    - 顯示目前字數（`N words`）。
    - 顯示儲存狀態（Saving / Autosave failed / Saved at HH:mm:ss）。
    - 右側提供縮放控制：
      - Range 0.7–1.4（70%–140%）。
      - 即時顯示目前百分比。

### 4. 資料流與儲存格式

- **載入流程**
  1. 由路由參數取得 `id`，透過 `fetchNoteById` 取得筆記。
  2. 後端回傳的 `content` 為 HTML 字串。
  3. 前端呼叫 `editor.commands.setContent(content)`，並根據內容計算初始字數。
- **儲存與自動儲存**
  - 手動儲存（Save 按鈕）：
    1. 由 TipTap `editor.getHTML()` 取得最新 HTML。
    2. 經 `contentToBlocks` / `blocksToContent`（目前等價轉換）後呼叫 `createNote` 或 `updateNote`。
  - Autosave：
    - `useNoteAutosave` 監聽 `note.title` 與 `note.content`，debounce 後呼叫 `updateNote`，並透過 `emitNoteUpdated` 做即時同步。
- **後端存儲**
  - `server/src/api/notes.ts` 中 `formatNote` 顯示 `content` 欄位為單純字串。
  - 資料庫目前直接儲存 HTML，不做結構化分段（未使用 JSON schema）。

### 5. 安全與相容性考量

- **安全性**
  - 因為內容以 HTML 儲存，長期建議：
    - 前端輸出前使用 HTML sanitizer（例如 DOMPurify）。
    - 後端在儲存或回傳前再做一次清洗，避免 script/style 注入。
- **向後相容**
  - 舊資料同樣是 HTML，因此可以直接由 TipTap `setContent` 載入。
  - 若未來改存 TipTap JSON，可：
    - 新增欄位 `contentJson`，同時保留 `content` 作為 fallback。
    - 在載入時優先讀 JSON；若不存在則由 HTML 轉換為 JSON。

### 6. 後續改進建議

- **功能面**
  - 完成 Insert Tab：圖片上傳、表格插入、程式碼區塊、引用樣式。
  - 支援多頁視覺（依實際內容高度切分 Page 1 / Page 2 …）。
  - 新增匯出 PDF 功能（後端使用既有 `puppeteer` 渲染 HTML → PDF）。
- **體驗面**
  - 提供 Word 類似的快捷鍵（Ctrl+B/I/U、Ctrl+K 插入連結、Ctrl+S 儲存）。
  - 為 Ribbon 群組加上 tooltip 與狀態說明。
  - 視窗寬度變動時，自動調整縮放以維持「紙張剛好適配畫面寬度」。

