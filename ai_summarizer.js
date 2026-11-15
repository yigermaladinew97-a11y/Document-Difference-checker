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

  if (stats.similarityPercent === 100) {
    return {
      mode: 'local_fallback',
      contextSimilarityPercent: 100,
      executiveSummary: 'Both documents are 100% word-for-word and structurally identical. No additions, deletions, edits, or relocated sections were detected.',
      keySemanticChanges: ['Document content is completely unchanged.'],
      criticalAlerts: [],
      toneShift: 'Identical structure and tone.'
    };
  }

  // 1. Synthesize rich narrative Executive Summary
  const narrativeParts = [];
  narrativeParts.push(`The comparison between the two documents reveals a ${stats.similarityPercent}% overall alignment.`);

  const structuralPoints = [];
  if (moved.length > 0) {
    structuralPoints.push(`${moved.length} section(s) were relocated to new positions (e.g. ${moved.slice(0, 2).map(m => `${m.movedFrom} ➔ ${m.movedTo}`).join(', ')})`);
  }
  if (modified.length > 0) {
    structuralPoints.push(`${modified.length} section(s) contain textual revisions`);
  }
  if (added.length > 0) {
    structuralPoints.push(`${added.length} new section(s) were introduced`);
  }
  if (deleted.length > 0) {
    structuralPoints.push(`${deleted.length} section(s) were removed`);
  }

  if (structuralPoints.length > 0) {
    narrativeParts.push(`Key updates include: ${structuralPoints.join('; ')}.`);
  }

  narrativeParts.push(`Overall diff reflects +${stats.addedWords} words added and -${stats.deletedWords} words removed across ${stats.totalWordsB} total words in Document B.`);

  const executiveSummary = narrativeParts.join(' ');

  // 2. High-value key changes with exact contextual descriptions
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

  // 3. Scan for critical alerts (e.g. omitted sections, metric updates)
  if (deleted.length > 0) {
    alerts.push(`Omitted Content: ${deleted.length} section(s) from Document A are missing in Document B (${deleted.slice(0, 3).map(d => `"${d.title}"`).join(', ')}).`);
  }

  const numChanges = modified.filter(m => m.description && m.description.includes('Updated values:'));
  if (numChanges.length > 0) {
    alerts.push(`Numerical / Metric Discrepancies: Quantitative figures were revised in ${numChanges.map(s => s.title).join(', ')}.`);
  }

  // 4. Tone shift & length comparison
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
    executiveSummary,
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

    return {
      mode: 'ai',
      contextSimilarityPercent: Math.min(100, Math.max(0, Number(parsed.contextSimilarityPercent) || stats.similarityPercent)),
      executiveSummary: parsed.executiveSummary || 'AI analysis completed.',
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
