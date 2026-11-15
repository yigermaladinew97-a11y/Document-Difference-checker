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
 * Fallback generator when no Gemini API key is provided or on offline mode
 */
/**
 * Fallback generator when no Gemini API key is provided or on offline mode
 * Generates an articulate, human-grade analytical summary and specific change descriptions.
 */
function generateLocalContextAnalysis(stats, sectionReports = [], summary = {}) {
  const alerts = [];
  const changes = [];

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
  if (stats.similarityPercent === 100) {
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

    executiveSummary = `The comparison between the two documents reveals a ${stats.similarityPercent}% overall alignment. Key updates include: ${structuralNotes.join('; ')}. Overall diff reflects +${stats.addedWords} words added and -${stats.deletedWords} words removed across ${stats.totalWordsB} total words in Document B.`;
  }

  // 3. Structured Explanations & Key Insights List (For rich visual presentation)
  const explanations = [];

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

  return {
    mode: 'local_fallback',
    contextSimilarityPercent: contextScore,
    verdictHeadline,
    executiveSummary,
    explanations,
    structuralBreakdown,
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
  apiKey
}) {
  const resolvedKey = apiKey || process.env.GEMINI_API_KEY;

  // If no API key is provided, return rich local fallback immediately
  if (!resolvedKey || resolvedKey.trim() === '') {
    return generateLocalContextAnalysis(stats, sectionReports, summary);
  }

  try {
    const genAI = new GoogleGenerativeAI(resolvedKey);
    // Use gemini-2.5-flash for fastest, high-quality analytical comparison
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const sectionsContext = sectionReports && sectionReports.length > 0
      ? `\n\n--- DETAILED SECTION BREAKDOWN (${sectionReports.length} sections) ---\n` +
        sectionReports.slice(0, 40).map(s => `- ${s.title}: [${s.status}] (${s.similarityPercent}% match) -> ${s.description}`).join('\n')
      : '';

    const prompt = `You are an expert document comparison and legal/business contract analyst.
Compare the following two documents:

--- DOCUMENT A (ORIGINAL) ---
${safeTruncate(textA)}

--- DOCUMENT B (MODIFIED) ---
${safeTruncate(textB)}
${sectionsContext}

Analyze the contextual, substantive, and meaning differences between them.
Provide a high-impact, professional executive summary that clearly explains:
1. What main ideas, provisions, numbers, or sections changed.
2. The practical difference and real-world impact between Document A and Document B.
3. Actionable bullet points in keySemanticChanges detailing the exact changes with specific excerpts, values, and affected sections.

Return a STRICT JSON object matching this exact schema:
{
  "contextSimilarityPercent": <number between 0 and 100 representing how closely the core meaning and obligations match, even if wording changed>,
  "executiveSummary": "<2-4 sentence clear, professional, executive-ready summary of the core differences, what was added/removed, and the overall impact>",
  "keySemanticChanges": [
    "<specific bullet point 1 explaining a meaningful change with exact details (e.g. altered prices, dates, liability, names, moved slides)>",
    "<specific bullet point 2>",
    "<specific bullet point 3>"
  ],
  "criticalAlerts": [
    "<any high-risk changes, removed clauses, altered financial metrics, or major discrepancies. Empty array if none>"
  ],
  "toneShift": "<description of any tone or style shift (e.g. 'Shifted from collaborative to strict legal language' or 'Expanded with additional technical specificity')>"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(cleanJsonResponse(responseText));
    const localFallback = generateLocalContextAnalysis(stats, sectionReports, summary);

    return {
      mode: 'ai',
      contextSimilarityPercent: Math.min(100, Math.max(0, Number(parsed.contextSimilarityPercent) || stats.similarityPercent)),
      verdictHeadline: parsed.verdictHeadline || localFallback.verdictHeadline,
      executiveSummary: parsed.executiveSummary || 'AI analysis completed.',
      explanations: (Array.isArray(parsed.explanations) && parsed.explanations.length > 0)
        ? parsed.explanations
        : localFallback.explanations,
      structuralBreakdown: localFallback.structuralBreakdown,
      keySemanticChanges: Array.isArray(parsed.keySemanticChanges) ? parsed.keySemanticChanges : [],
      criticalAlerts: Array.isArray(parsed.criticalAlerts) ? parsed.criticalAlerts : [],
      toneShift: parsed.toneShift || 'Neutral'
    };
  } catch (error) {
    console.warn(`[AI Context Engine] Note: Gemini API call failed (${error.message}). Falling back to local analysis.`);
    const fallback = generateLocalContextAnalysis(stats, sectionReports, summary);
    fallback.aiError = error.message;
    return fallback;
  }
}
