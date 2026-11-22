# 🎓 DocDiff Pro - Code Presentation & Architecture Guide

> **Speaker's Cheat Sheet & Presentation Notes**  
> Use this guide to walk through your code with confidence during your project demonstration, technical interview, or viva examination.

---

## ⚡ 1. The 30-Second Elevator Pitch (Start with this)

> *"DocDiff Pro is an enterprise document intelligence and comparison platform. It ingests multi-format documents—PDFs, Word documents, Excel spreadsheets, PowerPoint decks, and text files—and performs instant, word-level redline diffing directly in memory. It combines the deterministic precision of the Myers diff algorithm and the Sørensen-Dice similarity metric with Google Gemini AI for automated legal and financial risk radar auditing. It requires zero disk retention, ensuring complete data privacy."*

---

## 🏗️ 2. High-Level Architecture (How Frontend, Backend & Data Work)

```
┌──────────────────────────────────────────────────────────┐
│              FRONTEND (React 18 + Vite + Tailwind)       │
│  - DualDropzone (Drag & Drop)   - Split / Unified Diff   │
│  - CurtainSwipeLens (Overlay)   - Live Risk Radar UI     │
│  - 1-Click PDF & Excel Exporters- 2FA / Password Modal   │
└────────────────────────────┬─────────────────────────────┘
                             │ HTTP POST (Multipart Buffers)
                             ▼
┌──────────────────────────────────────────────────────────┐
│              BACKEND (Node.js + Express 4)               │
│  - Multer In-Memory Storage (Zero Disk Retention)        │
│  - High-Speed HTTP Gzip Compression (80% smaller)        │
│  - PBKDF2 Password Security & JWT Authentication         │
└──────────────┬─────────────────────────────┬─────────────┘
               │                             │
               ▼                             ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│  PARSING & DIFF ENGINE    │ │   AI CONTEXT & RISK RADAR │
│  - parsers.js: PDF, DOCX, │ │   - ai_summarizer.js      │
│    XLSX, PPTX, TXT        │ │   - Google Gemini API     │
│  - comparator.js:         │ │     (Multi-model fallback)│
│    Myers Diff + Dice Score│ │   - Deterministic Local   │
│    Noise Filters (Spaces) │ │     Heuristic Fallback    │
└───────────────────────────┘ └───────────────────────────┘
```

---

## 📂 3. The 5 Core Files to Walk Through

When sharing your screen, walk through the files in this logical order:

### 1️⃣ `server.js` (The Controller)
* **What to show**:
  * Lines 1–45: In-memory Multer configuration (`multer.memoryStorage()`) — explain that **no customer files are ever written to hard disk**.
  * `app.post('/api/compare')`: The central pipeline that accepts two files, extracts their content, runs the comparison, enriches with AI, and returns clean JSON.
  * Section banners: Show how cleanly the API routes are separated into Health, Comparison, Batch, Auth, and Export.

### 2️⃣ `parsers.js` (The Ingestion Subsystem)
* **What to show**:
  * Universal multi-format extraction:
    * **PDF**: Uses `unpdf` with an automatic, resilient fallback to `pdf-parse`.
    * **Word (.docx)**: Uses `mammoth` to extract paragraph text without losing structure.
    * **Excel (.xlsx)**: Uses `xlsx` (SheetJS) to convert sheets into structured cell matrices.
    * **PowerPoint (.pptx)**: Parses XML slide trees to extract speaker notes and slide content.
  * `normalizeText()`: Sanitizes exotic Unicode spaces, zero-width characters, and unifies line breaks (`\r\n` ➔ `\n`).

### 3️⃣ `comparator.js` (The Mathematical Diff Engine)
* **What to show**:
  * `safeWordDiff()` & `hybridDiffWords()`: Explain that traditional Myers diff has an $O(N^2)$ worst-case complexity. Our engine uses **hierarchical line-anchored diffing** for large documents, guaranteeing sub-second execution on 50+ page contracts.
  * `calculateWordSimilarity()`: Implements the **Sørensen-Dice Coefficient**:
    $$\text{Similarity} = \frac{2 \times \text{Unchanged Words}}{\text{Words}_A + \text{Words}_B} \times 100$$
  * `filterText()`: Demonstrates smart noise filtering (ignoring numbers, case sensitivity, punctuation, or collapsing whitespace on demand).

### 4️⃣ `ai_summarizer.js` (Semantic Analysis & Risk Radar)
* **What to show**:
  * **Dual-Engine Architecture**: If an API key is present, it uses Gemini (`gemini-2.0-flash`, with fallbacks to `1.5-flash` and `2.5-flash`). If no API key is provided or the user is offline, it **never crashes**—it runs `detectLocalRiskRadar()`.
  * **Legal & Commercial Risk Radar**: Evaluates high-risk alterations:
    * `FINANCIAL`: Changed prices, currency figures, payment terms.
    * `LIABILITY`: Modified indemnity clauses, warranties, liquidated damages.
    * `TERMINATION`: Shortened notice windows, altered cure periods.
    * `COMPLIANCE`: Deleted clauses from baseline contracts.

### 5️⃣ `authService.js` & `emailService.js` (Security Layer)
* **What to show**:
  * Password hashing using **PBKDF2 with SHA-512** and 10,000 iterations with unique cryptographically random salts (no plaintext passwords).
  * 2FA & Password Reset OTP: Generates time-sensitive 6-digit codes with rate limits and 45-second cooldowns.
  * In development, `emailService.js` runs in **Simulation Mode** (prints a visual card in the terminal) so you can demo 2FA without needing real SMTP credentials!

---

## 💡 4. Top 5 Questions Judges Ask & How to Answer

### Q1: *"Where is the database and how do you store user passwords?"*
> **Answer**:  
> *"User data and cloud history are stored in clean JSON records in `/data/` on the server. Passwords are never stored in plain text; we hash them using Node's native `crypto.pbkdf2Sync` with SHA-512, a 64-byte random salt, and 10,000 iterations. Sessions use signed JWT tokens (HMAC-SHA256)."*

### Q2: *"What happens if a user compares a confidential 100-page document?"*
> **Answer**:  
> *"First, we use in-memory buffers via `multer.memoryStorage()`, meaning the file buffer exists only in RAM during the request life cycle and is garbage-collected immediately. Second, for large files, our comparator uses hierarchical line anchoring so memory and CPU consumption stay linear $O(N)$."*

### Q3: *"How does the application work if the Gemini API is down or has no internet?"*
> **Answer**:  
> *"The system is built on graceful degradation. In `ai_summarizer.js`, the local heuristic engine (`generateLocalContextAnalysis` and `detectLocalRiskRadar`) computes statistical and regex-based risk scores entirely on the local machine with 0 external network requests."*

### Q4: *"How does the 1-Click PDF export work?"*
> **Answer**:  
> *"Rather than running a heavy headless browser like Puppeteer on the server (which consumes 200MB+ of RAM), we generate high-resolution print-ready vector HTML in `reportGenerator.js`. The client triggers the browser's native print engine with an automatic invisible iframe fallback, producing an executive A4 PDF with exact page-break protection."*

### Q5: *"Can you run your automated tests right now?"*
> **Answer**:  
> *"Yes, we have a unified automated test command. I can run `npm test`."*  
> *(Run `npm test` in the terminal — all 6 test suites will pass in ~3 seconds).*

---

## 🚀 5. Quick Commands for Live Demo

```bash
# 1. Run full test suite (Shows green checkmarks across all engines)
npm test

# 2. Start the local server
npm start
# -> Opens on http://localhost:3000

# 3. Build frontend bundle (if modified)
npm run build
```
