/**
 * ============================================================================
 * Contextual Analysis & Legal Risk Radar Subsystem (Dual-Engine)
 * ============================================================================
 * Provides an executive-level summary, tone shift analysis, and legal risk audit.
 *
 * Dual-Engine Architecture:
 *  - Primary Engine   : Google Gemini API (gemini-2.0-flash, gemini-1.5-flash, gemini-2.5-flash)
 *  - Secondary Engine : Local Deterministic Heuristics (100% operational with zero API keys)
 *
 * Risk Radar Audit:
 *  - Financial: Monetary alterations, price adjustments, payment milestone changes
 *  - Liability: Warranty, indemnity, and liquidated damages obligations
 *  - Termination: Notice periods, cancellation rights, cure periods
 *  - Compliance: Baseline clause deletions, scope omissions
 * ============================================================================
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Truncate long text strings safely for LLM context limits
 */
function safeTruncate(str, maxChars = 30000) {
  if (!str) return '';
  if (str.length <= maxChars) return str;
  return str.slice(0, maxChars) + '\n\n... [Content truncated for model context limit]';
}

/**
 * Clean potential markdown backticks from JSON LLM responses
 */
function cleanJsonResponse(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Detect Legal, Financial, Identity, and Operational Risk Radar Heuristics
 */
export function detectLocalRiskRadar(textA = '', textB = '', sectionReports = [], stats = {}, entitySwaps = [], imageDiff = null) {
  const flags = [];
  let score = 0;

  // 1. Identity / Person / Entity Substitution (Highest Priority)
  if (entitySwaps && entitySwaps.length > 0) {
    score += 65;
    entitySwaps.forEach(swap => {
      flags.push({
        category: 'IDENTITY_SWAP',
        severity: 'CRITICAL',
        title: `Identity / Entity Name Swap: "${swap.entityA}" ➔ "${swap.entityB}"`,
        impact: `Document B is ${stats.similarityPercent || 0}% identical to Document A, but the primary party/person name has been substituted from "${swap.entityA}" to "${swap.entityB}" (${swap.count} occurrence(s)). This indicates a candidate replacement, contract transfer, or template plagiarism.`,
        clause: swap.context ? `Clause snippet: ${swap.context}` : 'Party / Identity Clause'
      });
    });
  }

  // 2. Embedded Photo & Visual Asset Discrepancy
  if (imageDiff && imageDiff.hasImages && imageDiff.status !== 'IDENTICAL') {
    if (imageDiff.status === 'REPLACED') {
      score += 35;
      imageDiff.mismatches.forEach(m => {
        flags.push({
          category: 'PHOTO_MISMATCH',
          severity: 'HIGH',
          title: m.title || 'Embedded Photo / Image Mismatch',
          impact: m.description || 'Embedded visual assets or profile images differ between Document A and Document B.',
          clause: 'Embedded Visual Media'
        });
      });
    } else if (imageDiff.status === 'MODIFIED') {
      score += 20;
      imageDiff.mismatches.forEach(m => {
        flags.push({
          category: 'PHOTO_MISMATCH',
          severity: m.severity || 'MEDIUM',
          title: m.title || 'Embedded Media Asset Difference',
          impact: m.description || 'Embedded visual assets were added or deleted.',
          clause: 'Embedded Visual Media'
        });
      });
    }
  }

  const modified = (sectionReports || []).filter(s => s.status === 'MODIFIED');
  const deleted = (sectionReports || []).filter(s => s.status === 'DELETED');
  const added = (sectionReports || []).filter(s => s.status === 'ADDED');

  const combinedDiffs = modified.map(m => `${m.title || ''} ${m.description || ''}`).join(' ') + ' ' + deleted.map(d => d.title || '').join(' ');
  const fullText = `${textA || ''} ${textB || ''}`;

  // 3. Financial & Numerical Commercial Terms
  const numRegex = /(\$\s*\d+[\d,]*(\.\d+)?|\b\d+[\d,]*(?:\.\d+)?\s*(?:days?|months?|years?|%|USD|EUR|GBP))/gi;
  const numsA = (textA.match(numRegex) || []).map(s => s.trim().toLowerCase());
  const numsB = (textB.match(numRegex) || []).map(s => s.trim().toLowerCase());
  const hasAlteredNumbers = numsA.some(n => !numsB.includes(n)) || numsB.some(n => !numsA.includes(n));

  const hasFinancialKeywords = /\$|\bUSD\b|\bEUR\b|\bfee\b|\bprice\b|\bpayment\b|\binterest\b/i.test(combinedDiffs) || hasAlteredNumbers;
  if (hasFinancialKeywords && stats.similarityPercent < 100) {
    score += 35;
    const examples = numsA.filter(n => !numsB.includes(n)).slice(0, 2);
    flags.push({
      category: 'FINANCIAL',
      severity: 'HIGH',
      title: 'Monetary Figures or Payment Terms Altered',
      impact: examples.length > 0
        ? `Commercial figures or payment milestones were updated (including changes affecting ${examples.join(', ')}).`
        : 'Payment rates, fees, or monetary obligations were modified between versions.',
      clause: 'Payment & Commercial Terms'
    });
  }

  // 2. Liability, Indemnity & Warranties
  if (/\bliabilit(y|ies)\b|\bindemnif(y|ication)\b|\bhold harmless\b|\bliquidated damages\b|\bwarrant(y|ies)\b/i.test(combinedDiffs) && stats.similarityPercent < 100) {
    score += 35;
    flags.push({
      category: 'LIABILITY',
      severity: 'HIGH',
      title: 'Liability, Indemnity, or Warranty Allocation Modified',
      impact: 'Core clauses governing legal liability exposure, warranty duration, or indemnification obligations have been altered.',
      clause: 'Liability & Warranties'
    });
  }

  // 3. Termination, Default & Breach Timelines
  if (/\bterminat(e|ion)\b|\bbreach\b|\bdefault\b|\bcure period\b|\bnotice period\b/i.test(combinedDiffs)) {
    score += 25;
    flags.push({
      category: 'TERMINATION',
      severity: 'MEDIUM',
      title: 'Termination, Breach, or Notice Windows Adjusted',
      impact: 'Terms dictating contract cancellation timelines, breach remedies, or cure periods were adjusted.',
      clause: 'Termination & Default'
    });
  }

  // 4. Deleted Sections (Omitted Rights / Obligations)
  if (deleted.length > 0) {
    const isHeavyDeletion = deleted.length >= 3;
    score += isHeavyDeletion ? 35 : 20;
    flags.push({
      category: 'COMPLIANCE',
      severity: isHeavyDeletion ? 'HIGH' : 'MEDIUM',
      title: `${deleted.length} Baseline Clause(s) Completely Omitted`,
      impact: `Clauses present in the original document were deleted in the revision (${deleted.slice(0, 3).map(d => `"${d.title}"`).join(', ')}).`,
      clause: deleted[0]?.title || 'Contract Scope'
    });
  }

  // 5. Intellectual Property & Confidentiality
  if (/\bintellectual property\b|\bconfidential\b|\btrade secret\b|\bownership\b/i.test(combinedDiffs)) {
    score += 20;
    flags.push({
      category: 'COMPLIANCE',
      severity: 'MEDIUM',
      title: 'IP Ownership or Confidentiality Scope Revised',
      impact: 'Definitions or restrictive covenants regarding proprietary assets and confidential disclosures were modified.',
      clause: 'Intellectual Property & Confidentiality'
    });
  }

  // Zero-diff normalization
  if (stats.similarityPercent === 100) {
    score = 0;
    flags.length = 0;
  } else if (flags.length === 0 && stats.similarityPercent < 75) {
    score = 15;
    flags.push({
      category: 'OPERATIONAL',
      severity: 'LOW',
      title: 'General Contractual & Textual Revisions',
      impact: 'Phrasing updates detected across multiple sections that should be verified for operational consistency.',
      clause: 'General Clauses'
    });
  }

  score = Math.min(100, Math.max(0, score));
  let overallRiskLevel = 'LOW';
  if (score >= 60) overallRiskLevel = 'HIGH';
  else if (score >= 30) overallRiskLevel = 'MEDIUM';

  let riskSummary = '';
  if (overallRiskLevel === 'HIGH') {
    riskSummary = 'High risk exposure detected: Significant adjustments to financial terms, liability, or omitted clauses warrant close counsel review.';
  } else if (overallRiskLevel === 'MEDIUM') {
    riskSummary = 'Moderate risk exposure detected: Quantitative metrics, termination windows, or specific clauses were updated.';
  } else {
    riskSummary = 'Low risk exposure: Modifications appear to be routine wording enhancements, styling adjustments, or minor editorial revisions.';
  }

  return {
    overallRiskLevel,
    riskScore: score,
    riskSummary,
    riskFlags: flags
  };
}

/**
 * Fallback generator when no Gemini API key is provided or on offline mode
 * Generates an articulate, human-grade analytical summary and specific change descriptions.
 */
export function generateLocalContextAnalysis(stats, sectionReports = [], summary = {}, textA = '', textB = '', entitySwaps = [], imageDiff = null) {
  const alerts = [];
  const changes = [];
  const explanations = [];

  const modified = sectionReports.filter(s => s.status === 'MODIFIED');
  const moved = sectionReports.filter(s => s.status === 'MOVED');
  const added = sectionReports.filter(s => s.status === 'ADDED');
  const deleted = sectionReports.filter(s => s.status === 'DELETED');
  const unchanged = sectionReports.filter(s => s.status === 'UNCHANGED');

  // Structural breakdown counts
  const structuralBreakdown = {
    modifiedCount: modified.length,
    addedCount: added.length,
    deletedCount: deleted.length,
    movedCount: moved.length,
    unchangedCount: unchanged.length
  };

  // 1. Executive Verdict Headline
  let verdictHeadline = '';
  if (entitySwaps && entitySwaps.length > 0) {
    verdictHeadline = `CRITICAL ALERT: Identity & Entity Name Swap Detected (${entitySwaps.map(s => `"${s.entityA}" ➔ "${s.entityB}"`).join(', ')})`;
  } else if (imageDiff && imageDiff.hasImages && imageDiff.status === 'REPLACED') {
    verdictHeadline = `Visual Asset Mismatch: Embedded Photo / Image Replaced in Document B`;
  } else if (stats.similarityPercent === 100) {
    verdictHeadline = 'Documents are 100% Identical in Content & Structure';
  } else if (stats.similarityPercent >= 85) {
    verdictHeadline = `High Content Alignment (${stats.similarityPercent}% Match) with Targeted Edits`;
  } else if (stats.similarityPercent >= 50) {
    verdictHeadline = `Moderate Content Alignment (${stats.similarityPercent}% Match) with Wording Updates`;
  } else if (stats.similarityPercent >= 25) {
    verdictHeadline = `Substantial Revisions Detected (${stats.similarityPercent}% Match)`;
  } else {
    verdictHeadline = `Major Structural Rewrite & Low Alignment (${stats.similarityPercent}% Match)`;
  }

  // 2. High-level Executive Takeaway Narrative
  let executiveSummary = '';
  if (stats.similarityPercent === 100) {
    executiveSummary = 'Both documents are completely identical in text, sequence, and structure. No additions, deletions, edits, or relocated sections were detected.';
  } else if (stats.similarityPercent < 25 && (added.length > 0 || deleted.length > 0)) {
    executiveSummary = `Document B represents a significant restructuring of Document A: ${deleted.length} baseline section(s) were removed and replaced with ${added.length} newly introduced section(s). Total diff reflects +${stats.addedWords} words added and -${stats.deletedWords} words removed across ${stats.totalWordsB} total words.`;
  } else {
    const structuralNotes = [];
    if (moved.length > 0) structuralNotes.push(`${moved.length} section(s) relocated to new positions`);
    if (modified.length > 0) structuralNotes.push(`${modified.length} section(s) contain textual revisions`);
    if (added.length > 0) structuralNotes.push(`${added.length} new section(s) introduced`);
    if (deleted.length > 0) structuralNotes.push(`${deleted.length} section(s) removed`);
    if (stats.whitespaceChanges > 0) structuralNotes.push(`${stats.whitespaceChanges} whitespace/spacing modification(s)`);

    executiveSummary = `The comparison between the two documents reveals a ${stats.similarityPercent}% overall alignment. Key updates include: ${structuralNotes.join('; ')}. Overall diff reflects +${stats.addedWords} words added and -${stats.deletedWords} words removed across ${stats.totalWordsB} total words in Document B.`;
  }

  // Highlight Identity Swap if present
  if (entitySwaps && entitySwaps.length > 0) {
    executiveSummary = `⚠️ CRITICAL NOTICE: Primary named entity or person was systematically substituted (${entitySwaps.map(s => `"${s.entityA}" ➔ "${s.entityB}" (${s.count}x)`).join(', ')}). Despite high similarity, this indicates contract reassignment or identity transfer. ${executiveSummary}`;
    alerts.unshift(`Identity Swap Alert: Document B replaces "${entitySwaps[0].entityA}" with "${entitySwaps[0].entityB}" across key clauses.`);
    explanations.unshift({
      title: 'Identity / Party Name Substitution',
      detail: `Named entity swapped from "${entitySwaps[0].entityA}" to "${entitySwaps[0].entityB}" across ${entitySwaps.reduce((acc, s) => acc + s.count, 0)} reference(s).`,
      type: 'danger'
    });
  }

  // Highlight Image / Photo Mismatch if present
  if (imageDiff && imageDiff.hasImages && imageDiff.status !== 'IDENTICAL') {
    alerts.push(`Visual Media Alert: ${imageDiff.mismatchesCount} embedded photo or media difference(s) detected.`);
    explanations.push({
      title: 'Embedded Photo / Image Mismatch',
      detail: `${imageDiff.mismatchesCount} embedded visual asset(s) differ or were replaced between Document A and Document B.`,
      type: 'warning'
    });
  }

  // 3. Structured Explanations & Key Insights List (For rich visual presentation)

  // Item 1: Alignment & Retention Insight
  if (stats.similarityPercent === 100) {
    explanations.push({
      title: 'Full Content & Layout Parity',
      detail: 'Every word, section sequence, and paragraph matches exactly between Document A and Document B.',
      type: 'success'
    });
  } else if (stats.similarityPercent >= 80) {
    explanations.push({
      title: 'Strong Core Consistency',
      detail: `Over ${stats.similarityPercent}% of baseline content is retained verbatim, reflecting a focused polish rather than a fundamental rewrite.`,
      type: 'info'
    });
  } else if (stats.similarityPercent >= 50) {
    explanations.push({
      title: 'Moderate Revision Density',
      detail: `Approximately ${stats.similarityPercent}% of text remains aligned, but key phrasing, terminology, or structural sections have been updated.`,
      type: 'warning'
    });
  } else {
    explanations.push({
      title: 'Extensive Restructuring & Scope Shift',
      detail: `Low alignment (${stats.similarityPercent}% match) indicates extensive revisions, new sections, or substantial rewriting between versions.`,
      type: 'warning'
    });
  }

  // Item 2: Section Turnover (Added & Deleted)
  if (added.length > 0 || deleted.length > 0) {
    const turnoverDetails = [];
    if (added.length > 0) turnoverDetails.push(`${added.length} new section(s) added to Document B`);
    if (deleted.length > 0) turnoverDetails.push(`${deleted.length} section(s) omitted from Document A`);
    explanations.push({
      title: 'Section Composition Shift',
      detail: `Structural changes detected: ${turnoverDetails.join(', while ')}.`,
      type: deleted.length > 5 ? 'warning' : 'info'
    });
  }

  // Item 3: Relocated Sections
  if (moved.length > 0) {
    explanations.push({
      title: `${moved.length} Relocated ${moved.length === 1 ? 'Section' : 'Sections'} Detected`,
      detail: `Slide and section content was preserved but rearranged in sequence (e.g. ${moved.slice(0, 2).map(m => `"${m.movedFrom}" ➔ "${m.movedTo}"`).join(', ')}).`,
      type: 'info'
    });
  }

  // Item 4: Net Volume Impact
  if (stats.addedWords > 0 || stats.deletedWords > 0) {
    const netGrowth = stats.addedWords - stats.deletedWords;
    const netDesc = netGrowth > 0 ? `Net expansion of +${netGrowth} words` : netGrowth < 0 ? `Net reduction of ${Math.abs(netGrowth)} words` : 'Zero net word count change';
    explanations.push({
      title: 'Word Volume & Net Expansion',
      detail: `${netDesc} (+${stats.addedWords} added vs -${stats.deletedWords} removed) across ${stats.totalWordsB} total words in Document B.`,
      type: 'info'
    });
  }

  // Item 5: Numerical / Quantitative Updates
  const numChanges = modified.filter(m => m.description && m.description.includes('Updated values:'));
  if (numChanges.length > 0) {
    explanations.push({
      title: 'Quantitative & Financial Figures Altered',
      detail: `Specific metrics, monetary figures, or milestones were revised in ${numChanges.slice(0, 3).map(s => s.title).join(', ')}.`,
      type: 'warning'
    });
  }

  // Item 6: Formatting & Whitespace Shifts
  if (stats.whitespaceChanges > 0) {
    explanations.push({
      title: 'Formatting & Spacing Variations',
      detail: `${stats.whitespaceChanges} whitespace or indentation modification(s) flagged while Normalize Spaces is OFF.`,
      type: 'info'
    });
  }

  // 4. High-value key changes with exact contextual descriptions
  for (const m of moved.slice(0, 4)) {
    changes.push(`[Relocated] ${m.title}: ${m.description}`);
  }
  for (const m of modified.slice(0, 6)) {
    changes.push(`[Modified] ${m.title}: ${m.description} (${m.similarityPercent}% match)`);
  }
  for (const a of added.slice(0, 3)) {
    changes.push(`[Added] ${a.title}: ${a.description}`);
  }
  for (const d of deleted.slice(0, 3)) {
    changes.push(`[Removed] ${d.title}: ${d.description}`);
  }

  // 5. Scan for critical alerts (e.g. omitted sections, metric updates)
  if (deleted.length > 0) {
    alerts.push(`Omitted Content: ${deleted.length} section(s) from Document A are missing in Document B (${deleted.slice(0, 3).map(d => `"${d.title}"`).join(', ')}).`);
  }

  if (numChanges.length > 0) {
    alerts.push(`Numerical / Metric Discrepancies: Quantitative figures were revised in ${numChanges.map(s => s.title).join(', ')}.`);
  }

  // 6. Tone shift & length comparison
  let toneShift = 'Consistent with original content.';
  if (stats.totalWordsA > 0 && stats.totalWordsB > 0) {
    const diffRatio = (stats.totalWordsB - stats.totalWordsA) / stats.totalWordsA;
    if (diffRatio > 0.15) {
      toneShift = `Expanded detail (Document B is +${Math.round(diffRatio * 100)}% longer).`;
    } else if (diffRatio < -0.15) {
      toneShift = `Condensed content (Document B is ${Math.round(Math.abs(diffRatio) * 100)}% shorter).`;
    }
  }

  // Estimate contextual similarity
  let contextScore = stats.similarityPercent;
  if (stats.similarityPercent > 80 && deleted.length === 0) {
    contextScore = Math.min(99, Math.round(stats.similarityPercent * 1.05 * 10) / 10);
  }

  const riskRadar = detectLocalRiskRadar(textA, textB, sectionReports, stats, entitySwaps, imageDiff);

  return {
    mode: 'local_fallback',
    contextSimilarityPercent: contextScore,
    verdictHeadline,
    executiveSummary,
    explanations,
    structuralBreakdown,
    riskRadar,
    keySemanticChanges: changes.length > 0 ? changes : ['Minor text adjustments across the document.'],
    criticalAlerts: alerts,
    toneShift
  };
}

/**
 * Main Context Analysis Engine
 * Evaluates semantic differences and context using Gemini (if key provided),
 * otherwise falls back smoothly to local structural heuristics.
 */
export async function analyzeDocumentContext({
  textA,
  textB,
  stats,
  sectionReports = [],
  summary,
  apiKey,
  entitySwaps = [],
  imageDiff = null
}) {
  const resolvedKey = apiKey || process.env.GEMINI_API_KEY;

  // If no API key is provided, return rich local fallback immediately
  if (!resolvedKey || resolvedKey.trim() === '') {
    return generateLocalContextAnalysis(stats, sectionReports, summary, textA, textB, entitySwaps, imageDiff);
  }

  const localFallback = generateLocalContextAnalysis(stats, sectionReports, summary, textA, textB, entitySwaps, imageDiff);

  try {
    const genAI = new GoogleGenerativeAI(resolvedKey);
    const candidateModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];
    let lastError = null;
    let result = null;

    const sectionsContext = sectionReports && sectionReports.length > 0
      ? `\n\n--- DETAILED SECTION BREAKDOWN (${sectionReports.length} sections) ---\n` +
        sectionReports.slice(0, 40).map(s => `- ${s.title}: [${s.status}] (${s.similarityPercent}% match) -> ${s.description}`).join('\n')
      : '';

    const entityContext = entitySwaps && entitySwaps.length > 0
      ? `\n\n--- DETECTED IDENTITY/PARTY NAME SUBSTITUTIONS ---\n` +
        entitySwaps.map(s => `• Swapped "${s.entityA}" in Doc A with "${s.entityB}" in Doc B (${s.count} occurrences)`).join('\n')
      : '';

    const imageContext = imageDiff && imageDiff.hasImages && imageDiff.status !== 'IDENTICAL'
      ? `\n\n--- EMBEDDED IMAGE / MEDIA DIFFERENCES ---\n` +
        imageDiff.mismatches.map(m => `• ${m.title}: ${m.description}`).join('\n')
      : '';

    const prompt = `You are an expert document comparison, contract audit, and corporate legal analyst.
Compare the following two documents:

--- DOCUMENT A (ORIGINAL) ---
${safeTruncate(textA)}

--- DOCUMENT B (MODIFIED) ---
${safeTruncate(textB)}
${sectionsContext}
${entityContext}
${imageContext}

Analyze the contextual, substantive, financial, and legal differences between them.
NOTE: If high textual similarity hides a party, person, or candidate identity swap (e.g. Alice Walker vs Bob Jenkins) or replaced embedded profile photos, explicitly highlight this in verdictHeadline, executiveSummary, and riskRadar flags.
Provide:
1. Executive Summary in plain English (2-3 sentences explaining what changed, what was added/removed, and real-world impact).
2. Legal & Financial Risk Radar (risk level, risk score 0-100, concise risk summary, and specific risk flags for changes in liability, pricing, termination, IP, compliance, or identity swap).
3. Specific Key Semantic Changes (3-6 clear bullet points with exact values, dates, percentages, and section references).

Return a STRICT JSON object matching this exact schema:
{
  "contextSimilarityPercent": <number between 0 and 100 representing core meaning alignment>,
  "verdictHeadline": "<One strong, executive headline summarizing the primary change>",
  "executiveSummary": "<2-3 sentence executive-ready summary of core differences and real-world impact>",
  "riskRadar": {
    "overallRiskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "riskScore": <integer between 0 and 100>,
    "riskSummary": "<1-2 sentence summary of legal and financial exposure>",
    "riskFlags": [
      {
        "category": "LIABILITY" | "FINANCIAL" | "TERMINATION" | "COMPLIANCE" | "OPERATIONAL",
        "severity": "HIGH" | "MEDIUM" | "LOW",
        "title": "<Short descriptive risk title>",
        "impact": "<Why this matters to legal, financial, or operational stakeholders>",
        "clause": "<Section or clause name if identifiable>"
      }
    ]
  },
  "keySemanticChanges": [
    "<specific bullet point 1 explaining meaningful change with exact details (monetary numbers, dates, liability, names)>",
    "<specific bullet point 2>",
    "<specific bullet point 3>"
  ],
  "criticalAlerts": [
    "<any high-risk changes, removed clauses, altered financial metrics, or major discrepancies. Empty array if none>"
  ],
  "toneShift": "<description of any tone or style shift (e.g. 'Shifted from collaborative to strict legal language' or 'Expanded with additional technical specificity')>"
}`;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });
        result = await model.generateContent(prompt);
        if (result && result.response) break;
      } catch (err) {
        lastError = err;
        console.warn(`[AI Context Engine] Model ${modelName} call failed (${err.message}). Trying next candidate...`);
      }
    }

    if (!result) {
      throw lastError || new Error('All candidate Gemini models failed.');
    }

    const responseText = result.response.text();
    const parsed = JSON.parse(cleanJsonResponse(responseText));

    // Merge AI Risk Radar with fallback if needed
    const aiRiskRadar = parsed.riskRadar || {};
    const finalRiskRadar = {
      overallRiskLevel: aiRiskRadar.overallRiskLevel || localFallback.riskRadar.overallRiskLevel,
      riskScore: typeof aiRiskRadar.riskScore === 'number' ? Math.min(100, Math.max(0, aiRiskRadar.riskScore)) : localFallback.riskRadar.riskScore,
      riskSummary: aiRiskRadar.riskSummary || localFallback.riskRadar.riskSummary,
      riskFlags: Array.isArray(aiRiskRadar.riskFlags) && aiRiskRadar.riskFlags.length > 0
        ? aiRiskRadar.riskFlags
        : localFallback.riskRadar.riskFlags
    };

    return {
      mode: 'ai',
      contextSimilarityPercent: Math.min(100, Math.max(0, Number(parsed.contextSimilarityPercent) || stats.similarityPercent)),
      verdictHeadline: parsed.verdictHeadline || localFallback.verdictHeadline,
      executiveSummary: parsed.executiveSummary || localFallback.executiveSummary,
      explanations: (Array.isArray(parsed.explanations) && parsed.explanations.length > 0)
        ? parsed.explanations
        : localFallback.explanations,
      structuralBreakdown: localFallback.structuralBreakdown,
      riskRadar: finalRiskRadar,
      keySemanticChanges: Array.isArray(parsed.keySemanticChanges) && parsed.keySemanticChanges.length > 0
        ? parsed.keySemanticChanges
        : localFallback.keySemanticChanges,
      criticalAlerts: Array.isArray(parsed.criticalAlerts) ? parsed.criticalAlerts : localFallback.criticalAlerts,
      toneShift: parsed.toneShift || localFallback.toneShift
    };
  } catch (error) {
    console.warn(`[AI Context Engine] Note: Gemini API call failed (${error.message}). Falling back to local analysis.`);
    localFallback.aiError = error.message;
    return localFallback;
  }
}
