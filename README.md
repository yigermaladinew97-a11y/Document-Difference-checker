# DocDiff Pro &bull; Intelligent Document Difference Checker 📄🔍

An enterprise-grade, multi-format document comparison system that analyzes both **exact word-by-word differences** and **semantic/contextual meaning** across PDFs, Word documents, Excel spreadsheets, PowerPoint presentations, and text files.

Designed with a high-end agency aesthetic (inspired by modern digital product design) with 3D interactive physics tilt cards, animated count-up metrics, and synchronized side-by-side diff viewing.

---

## 🌟 Key Capabilities

### 1. Multi-Format Ingestion Engine
- 📑 **PDF (`.pdf`)**: Page-by-page text & layout extraction using modern Mozilla-compliant `unpdf`.
- 📝 **Word (`.docx`)**: Paragraphs, headers, and bullet points via `mammoth`.
- 📊 **Excel (`.xlsx`, `.xls`, `.csv`)**: Sheet-by-sheet tabular grid comparisons via `xlsx`.
- 📽️ **PowerPoint (`.pptx`)**: Slide-by-slide sequence extraction via `adm-zip`.
- 📜 **Plain Text & Markdown (`.txt`, `.md`, `.json`)**: Raw character and token comparison.
- **Cross-Format Comparison**: Compare a `.docx` file against a `.pdf`, or an `.xlsx` sheet against a `.docx` specification!

### 2. Two-Tier Scoring Model
- **Lexical Score (Word Match %)**: Token-level sequence diff using Myers Diff and Sørensen-Dice similarity.
- **Contextual Score (Semantic %)**: Evaluates whether the underlying meaning, obligations, and intent were preserved even if phrasing changed.

### 3. Difference Description & AI Analysis
- **Executive Synthesis**: Concise 2-3 sentence overview of all core differences.
- **High-Risk Alerts**: Flags altered pricing, shortened warranty windows, modified liability caps, and removed clauses.
- **Tone Shift Detection**: Detects stylistic and legal severity shifts.
- **Dual-Engine Flexibility**: Powered by **Google Gemini 2.5 Flash** when an API key is provided, with **100% offline local algorithmic fallback** when no key is entered.

### 4. Interactive Modern Web UI (React + Tailwind + Lucide)
- **3D Physics Tilt Cards**: Cards physically tilt in 3D space tracking cursor movement with dynamic radial light sheens.
- **Animated Circular Progress Gauges**: Sweeping gauge arcs with spring-animated count-up percentages.
- **Synchronized Side-by-Side Diff Viewer**: Scrolling Document A scrolls Document B in exact lockstep.
- **Interactive Diff Tokens**: Hover over red deletions or green additions to see micro-hover elevations and drop shadows.
- **Confetti Celebration**: Particle burst on every completed comparison.
- **Dual Theme Support**: Crisp, modern Light agency look by default, with dark mode toggle.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm

### 1. Install & Build
```bash
# Clone the repository
git clone https://github.com/yigermaladinew97-a11y/Document-Difference-checker.git
cd Document-Difference-checker

# Install root server dependencies
npm install

# Install client dependencies & build the React UI
cd client
npm install
npm run build
cd ..
```

### 2. Launch the Application
```bash
npm start
```

Open your browser and navigate to:
👉 **`http://localhost:3000`**

---

## 🧪 Verification & Test Suites

You can test each subsystem independently using the built-in test runners:

```bash
# 1. Test multi-format parsers (PDF, DOCX, XLSX, PPTX, TXT)
npm run test:parsers

# 2. Test lexical comparator & sequence diff engine
npm run test:comparator

# 3. Test AI and local context analysis engine
npm run test:ai

# 4. Test Web server & compare API endpoint
npm run test:server
```

---

## 🏗️ Project Architecture

```
Document-Difference-checker/
├── parsers.js               # Multi-format document parsers (PDF, DOCX, XLSX, PPTX, TXT)
├── comparator.js            # Lexical word-by-word diff engine & percentage calculator
├── ai_summarizer.js         # Gemini 2.5 Flash semantic analysis & local fallback
├── server.js                # Express API server & static file host (Port 3000)
├── test-parsers.js          # In-memory test suite for all 5 document formats
├── test-comparator.js       # Comparator test suite (identical, edits, sections)
├── test-ai.js               # AI & local fallback context test suite
├── test-server.js           # Server & multipart upload test suite
├── public/                  # Compiled production React frontend bundle
└── client/                  # React + Vite + Tailwind CSS source code
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx           # Header, format badges, AI key modal button
    │   │   ├── DualDropzone.jsx     # Side-by-side 3D tilt upload cards & sample loader
    │   │   ├── Scoreboard.jsx       # Circular gauges & animated CountUp stat cards
    │   │   ├── ExecutiveSummary.jsx # AI / local difference synthesis & risk alerts
    │   │   ├── SectionBreakdown.jsx # Granular page/slide/sheet change accordion
    │   │   ├── DiffViewer.jsx       # Side-by-side & unified diff viewer with sync scroll
    │   │   ├── TiltCard.jsx         # 3D physics mouse-tilt container with cursor sheen
    │   │   ├── CountUp.jsx          # Quartic ease-out count-up number animation
    │   │   └── ApiKeyModal.jsx      # Google Gemini API key configuration modal
    │   ├── App.jsx                  # Main dashboard layout, state, & confetti trigger
    │   └── index.css                # Custom animations, dot pattern & theme styles
    └── vite.config.js               # Vite build configuration (outputs to ../public)
```

---

## 🔒 Privacy & Security

All document comparisons and text extractions are processed **100% in-memory**. No uploaded files are ever saved to disk or permanent databases, and user API keys are stored only in the browser's local storage.
