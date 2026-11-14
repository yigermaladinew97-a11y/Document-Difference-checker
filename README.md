# Document Difference Checker 📄🔍

An intelligent, multi-format document comparison system that analyzes both **exact word-by-word differences** and **semantic/contextual meaning** across PDFs, Word documents, Excel spreadsheets, PowerPoint presentations, and text files.

---

## 🚀 Features

- **Multi-Format Ingestion**:
  - 📑 **PDF (`.pdf`)**: Page-by-page extraction using modern `unpdf`.
  - 📝 **Word (`.docx`)**: Paragraph and heading parsing via `mammoth`.
  - 📊 **Excel (`.xlsx`, `.xls`)**: Tabular sheet-by-sheet extraction via `xlsx`.
  - 📽️ **PowerPoint (`.pptx`)**: Slide-by-slide XML parsing via `adm-zip`.
  - 📜 **Plain Text / Markdown (`.txt`, `.md`, `.json`)**.
- **Two-Tier Comparison Engine**:
  - **Word Match Score (Lexical %)**: Exact word-level diffing highlighting additions (green) and deletions (red).
  - **Context Score (Semantic %)**: Evaluates whether the underlying meaning or intent changed.
  - **Section Inspector**: Pinpoints changes per page, slide, or sheet.
- **AI Context & Summarization**:
  - Powered by **Google Gemini** (`gemini-2.5-flash`) for deep executive summaries, risk alerts, and tone change analysis.
  - **Zero-Friction Local Fallback**: Seamlessly operates 100% offline with local heuristic analysis if no API key is provided.

---

## 🛠️ Verification & Testing

Verify each subsystem via built-in test runners:

```bash
# 1. Test multi-format parsers (PDF, DOCX, XLSX, PPTX, TXT)
npm run test:parsers

# 2. Test word-level diff and similarity engine
npm run test:comparator

# 3. Test AI and local context analysis engine
npm run test:ai
```

---

## 📦 Next Steps

- [x] Step 1: Multi-Format Ingestion Engine
- [x] Step 2: Lexical Diff & Similarity Comparator
- [x] Step 3: AI Context & Summarization Engine
- [ ] Step 4: Express API & File Upload Server
- [ ] Step 5: Modern Web Dashboard UI
