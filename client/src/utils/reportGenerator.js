/**
 * DocDiff Pro - Executive PDF & HTML Audit Report Generator
 * Generates an agency-grade, print-ready document comparison audit report.
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateStandaloneReportHtml(data) {
  const meta = data?.meta || {};
  const metrics = data?.metrics || {};
  const stats = data?.stats || {};
  const summary = data?.summary || {};
  const contextAnalysis = data?.contextAnalysis || {};
  const sectionReports = data?.sectionReports || [];
  const diffTokens = data?.diffTokens || [];

  const docA = meta.docA || { filename: 'Document A', format: 'unknown', wordCount: 0 };
  const docB = meta.docB || { filename: 'Document B', format: 'unknown', wordCount: 0 };

  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const getStatusBadgeHtml = (status, pct) => {
    switch (status) {
      case 'UNCHANGED':
        return '<span class="badge badge-emerald">100% MATCH</span>';
      case 'MOVED':
        return `<span class="badge badge-purple">MOVED (${pct}%)</span>`;
      case 'MODIFIED':
        return `<span class="badge badge-amber">${pct}% MATCH</span>`;
      case 'ADDED':
        return '<span class="badge badge-blue">ADDED</span>';
      case 'DELETED':
        return '<span class="badge badge-rose">REMOVED</span>';
      default:
        return `<span class="badge badge-slate">${status}</span>`;
    }
  };

  // Render Redline diff text (first 1000 tokens for performance and readability)
  const redlineHtml = diffTokens.slice(0, 1500).map(token => {
    const val = escapeHtml(token.value);
    if (token.type === 'added') {
      return `<mark class="token-added">+${val}</mark>`;
    }
    if (token.type === 'removed') {
      return `<mark class="token-removed">-${val}</mark>`;
    }
    return `<span>${val}</span>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DocDiff Pro - Executive Audit Report (${escapeHtml(docA.filename)} vs ${escapeHtml(docB.filename)})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

    :root {
      --primary: #FF5E1E;
      --text: #0F172A;
      --text-muted: #64748B;
      --border: #E2E8F0;
      --bg-card: #FFFFFF;
      --bg-page: #F8FAFC;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg-page);
      color: var(--text);
      line-height: 1.5;
      padding: 40px 20px;
    }

    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 48px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
    }

    /* Floating Action Bar (Hidden during Print) */
    .action-bar {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      gap: 12px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(8px);
      padding: 8px 16px;
      border-radius: 9999px;
      box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .action-btn-primary {
      background: var(--primary);
      color: #FFFFFF;
    }

    .action-btn-primary:hover {
      background: #E04A0E;
      transform: translateY(-1px);
    }

    .action-btn-secondary {
      background: rgba(255, 255, 255, 0.15);
      color: #FFFFFF;
    }

    .action-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 2px solid var(--border);
      margin-bottom: 32px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      width: 44px;
      height: 44px;
      background: #FFF4EF;
      color: var(--primary);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 20px;
      border: 1px solid #FFE2D4;
    }

    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0F172A;
    }

    .brand-subtitle {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .audit-meta {
      text-align: right;
      font-size: 12px;
      color: var(--text-muted);
    }

    .audit-meta strong {
      color: #0F172A;
    }

    /* Comparison Target Cards */
    .doc-targets {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 32px;
    }

    .doc-card {
      padding: 18px;
      background: #F8FAFC;
      border: 1px solid var(--border);
      border-radius: 16px;
    }

    .doc-card-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .doc-card-name {
      font-size: 14px;
      font-weight: 700;
      color: #0F172A;
      word-break: break-all;
    }

    .doc-card-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* Metrics Scorecard */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 32px;
    }

    .metric-card {
      padding: 18px 14px;
      background: #FFFFFF;
      border: 1px solid var(--border);
      border-radius: 16px;
      text-align: center;
    }

    .metric-value {
      font-size: 26px;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      color: #0F172A;
    }

    .metric-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-top: 4px;
    }

    /* Callouts */
    .executive-box {
      padding: 24px;
      background: #FFF9F6;
      border: 1px solid #FFE7DD;
      border-radius: 18px;
      margin-bottom: 28px;
    }

    .executive-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .executive-title {
      font-size: 12px;
      font-weight: 800;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .executive-text {
      font-size: 14px;
      line-height: 1.6;
      color: #1E293B;
      font-weight: 500;
    }

    .alerts-box {
      padding: 20px;
      background: #FFF1F2;
      border: 1px solid #FECDD3;
      border-radius: 18px;
      margin-bottom: 28px;
    }

    .alerts-title {
      font-size: 12px;
      font-weight: 800;
      color: #E11D48;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .alerts-list {
      padding-left: 20px;
      font-size: 13px;
      color: #9F1239;
      font-weight: 500;
      line-height: 1.6;
    }

    /* Key Changes List */
    .key-changes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 32px;
    }

    .key-change-item {
      padding: 14px 16px;
      background: #F8FAFC;
      border: 1px solid var(--border);
      border-radius: 14px;
      font-size: 12px;
      color: #334155;
      font-weight: 500;
      line-height: 1.5;
    }

    /* Section Table */
    .table-container {
      margin-bottom: 36px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0F172A;
      margin-bottom: 14px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    th {
      text-align: left;
      padding: 10px 12px;
      background: #F1F5F9;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #F1F5F9;
      color: #1E293B;
      vertical-align: top;
    }

    tr:last-child td {
      border-bottom: none;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .badge-emerald { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
    .badge-amber   { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
    .badge-purple  { background: #F5F3FF; color: #7C3AED; border: 1px solid #DDD6FE; }
    .badge-blue    { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
    .badge-rose    { background: #FFF1F2; color: #E11D48; border: 1px solid #FECDD3; }
    .badge-slate   { background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; }

    /* Redline Section */
    .redline-box {
      padding: 24px;
      background: #FAFAFA;
      border: 1px solid var(--border);
      border-radius: 18px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.8;
      white-space: pre-wrap;
      word-break: break-word;
      color: #334155;
      margin-bottom: 32px;
    }

    .token-added {
      background: #DCFCE7;
      color: #15803D;
      text-decoration: none;
      padding: 1px 4px;
      border-radius: 4px;
      font-weight: 700;
    }

    .token-removed {
      background: #FEE2E2;
      color: #B91C1C;
      text-decoration: line-through;
      padding: 1px 4px;
      border-radius: 4px;
      font-weight: 700;
    }

    /* Footer */
    .report-footer {
      border-top: 1px solid var(--border);
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Print Stylesheet */
    @page {
      size: A4 portrait;
      margin: 1.5cm;
    }

    @media print {
      body {
        background: #FFFFFF !important;
        padding: 0 !important;
      }
      .action-bar {
        display: none !important;
      }
      .report-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .executive-box, .alerts-box, .doc-card, .metric-card, .key-change-item, tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .redline-box {
        background: #FFFFFF !important;
        border: 1px solid #E2E8F0 !important;
      }
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>
</head>
<body>

  <!-- Floating Action Bar for Print & Download -->
  <div class="action-bar no-print">
    <button onclick="window.print()" class="action-btn action-btn-primary">
      🖨️ Print / Save as PDF
    </button>
    <button onclick="window.close()" class="action-btn action-btn-secondary">
      ✕ Close
    </button>
  </div>

  <div class="report-container">
    <!-- Header -->
    <div class="header">
      <div class="brand">
        <div class="brand-icon">D</div>
        <div>
          <div class="brand-title">DocDiff Pro</div>
          <div class="brand-subtitle">Executive Audit Report</div>
        </div>
      </div>
      <div class="audit-meta">
        <div><strong>Date:</strong> ${escapeHtml(timestamp)}</div>
        <div><strong>Status:</strong> <span class="badge ${summary?.category === 'IDENTICAL' ? 'badge-emerald' : 'badge-amber'}">${escapeHtml(summary?.category || 'AUDITED')}</span></div>
        <div><strong>Engine:</strong> ${escapeHtml(metrics.analysisMode === 'ai' ? 'Gemini 2.5 Flash' : 'Algorithmic Sequence Matcher')}</div>
      </div>
    </div>

    <!-- Document Targets -->
    <div class="doc-targets">
      <div class="doc-card">
        <div class="doc-card-title">Document A (Original Baseline)</div>
        <div class="doc-card-name">📄 ${escapeHtml(docA.filename)}</div>
        <div class="doc-card-sub">${escapeHtml(docA.format?.toUpperCase())} • ${docA.wordCount} words • ${docA.sectionsCount || 1} sections</div>
      </div>
      <div class="doc-card">
        <div class="doc-card-title">Document B (Revised Comparison)</div>
        <div class="doc-card-name">📄 ${escapeHtml(docB.filename)}</div>
        <div class="doc-card-sub">${escapeHtml(docB.format?.toUpperCase())} • ${docB.wordCount} words • ${docB.sectionsCount || 1} sections</div>
      </div>
    </div>

    <!-- Metrics Scorecard -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value" style="color: var(--primary);">${metrics.lexicalSimilarityPercent || 0}%</div>
        <div class="metric-label">Lexical Match</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color: #10B981;">+${stats.addedWords || 0}</div>
        <div class="metric-label">Words Added</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color: #F43F5E;">-${stats.deletedWords || 0}</div>
        <div class="metric-label">Words Removed</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color: #64748B;">${stats.unchangedWords || 0}</div>
        <div class="metric-label">Matching Words</div>
      </div>
    </div>

    <!-- Executive Summary -->
    <div class="executive-box">
      <div class="executive-header">
        <span class="executive-title">Executive Summary & Analysis</span>
        ${contextAnalysis.toneShift ? `<span class="badge badge-slate">Tone: ${escapeHtml(contextAnalysis.toneShift)}</span>` : ''}
      </div>
      <p class="executive-text">${escapeHtml(contextAnalysis.executiveSummary || summary.headline || 'Detailed document analysis completed.')}</p>
    </div>

    <!-- Critical Alerts (if any) -->
    ${contextAnalysis.criticalAlerts && contextAnalysis.criticalAlerts.length > 0 ? `
    <div class="alerts-box">
      <div class="alerts-title">⚠️ Critical Alerts & Modified Obligations</div>
      <ul class="alerts-list">
        ${contextAnalysis.criticalAlerts.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Key Adjustments Grid -->
    ${contextAnalysis.keySemanticChanges && contextAnalysis.keySemanticChanges.length > 0 ? `
    <div class="section-title">Key Content Adjustments</div>
    <div class="key-changes-grid">
      ${contextAnalysis.keySemanticChanges.map(change => `
        <div class="key-change-item">• ${escapeHtml(change)}</div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Section Breakdown Table -->
    ${sectionReports && sectionReports.length > 0 ? `
    <div class="table-container">
      <div class="section-title">Section & Page-Level Breakdown (${sectionReports.length} parts)</div>
      <table>
        <thead>
          <tr>
            <th style="width: 8%;">#</th>
            <th style="width: 28%;">Section / Page</th>
            <th style="width: 18%;">Status</th>
            <th>Description of Changes</th>
          </tr>
        </thead>
        <tbody>
          ${sectionReports.map(sec => `
            <tr>
              <td><strong>${sec.index}</strong></td>
              <td><strong>${escapeHtml(sec.title)}</strong></td>
              <td>${getStatusBadgeHtml(sec.status, sec.similarityPercent)}</td>
              <td>${escapeHtml(sec.description)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Redline Diff Excerpt -->
    <div class="section-title">Redline Text Markup (Unified Diff)</div>
    <div class="redline-box">${redlineHtml || 'No textual changes detected.'}</div>

    <!-- Footer -->
    <div class="report-footer">
      <div>Generated by <strong>DocDiff Pro</strong> • Confidential Document Audit</div>
      <div>Verification Stamp: #${Math.random().toString(36).substring(2, 10).toUpperCase()}</div>
    </div>
  </div>

</body>
</html>`;
}

/**
 * Open print window and trigger native print / save as PDF
 */
export function openPrintPdfReport(data) {
  const html = generateStandaloneReportHtml(data);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the printable PDF report.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  // Give fonts and styles a brief moment to render before opening print dialog
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

/**
 * Download self-contained offline HTML audit report
 */
export function downloadHtmlAuditReport(data) {
  const html = generateStandaloneReportHtml(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filenameA = data?.meta?.docA?.filename?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'DocA';
  const filenameB = data?.meta?.docB?.filename?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'DocB';
  a.href = url;
  a.download = `DocDiff_Audit_Report_${filenameA}_vs_${filenameB}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
