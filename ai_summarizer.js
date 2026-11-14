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
function generateLocalContextAnalysis(stats, sectionReports, summary) {
  const alerts = [];
  const changes = [];

  const modified = sectionReports.filter(s => s.status === 'MODIFIED');
  const added = sectionReports.filter(s => s.status === 'ADDED');
  const deleted = sectionReports.filter(s => s.status === 'DELETED');

  if (deleted.length > 0) {
    alerts.push(`${deleted.length} section(s) completely removed in the comparison document.`);
  }

  if (stats.similarityPercent === 100) {
    return {
      mode: 'local_fallback',
      contextSimilarityPercent: 100,
      executiveSummary: 'Both documents are completely identical in both wording and semantic context.',
      keySemanticChanges: ['No semantic alterations detected.'],
      criticalAlerts: [],
      toneShift: 'Identical tone and structure.'
    };
  }

  for (const m of modified.slice(0, 5)) {
    changes.push(`Section "${m.title}": ${m.description} (${m.similarityPercent}% match).`);
  }
  for (const a of added.slice(0, 3)) {
    changes.push(`New Section Added: "${a.title}".`);
  }
  for (const d of deleted.slice(0, 3)) {
    changes.push(`Section Removed: "${d.title}".`);
  }

  // Estimate contextual similarity from word overlap and structure
  let contextScore = stats.similarityPercent;
  if (stats.similarityPercent > 80 && deleted.length === 0) {
    contextScore = Math.min(98, Math.round(stats.similarityPercent * 1.05 * 10) / 10);
  }

  return {
    mode: 'local_fallback',
    contextSimilarityPercent: contextScore,
    executiveSummary: `Local algorithmic evaluation: Documents are ${stats.similarityPercent}% lexically similar. ${stats.addedWords} words were added and ${stats.deletedWords} words were removed. Provide a Gemini API key to unlock deep semantic and legal nuance detection.`,
    keySemanticChanges: changes.length > 0 ? changes : ['Minor text adjustments across the document.'],
    criticalAlerts: alerts,
    toneShift: 'Consistent with original content.'
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
  sectionReports,
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

    const prompt = `You are an expert document comparison and legal/business contract analyst.
Compare the following two documents:

--- DOCUMENT A (ORIGINAL) ---
${safeTruncate(textA)}

--- DOCUMENT B (MODIFIED) ---
${safeTruncate(textB)}

Analyze the contextual, substantive, and meaning differences between them.
Return a STRICT JSON object matching this exact schema:
{
  "contextSimilarityPercent": <number between 0 and 100 representing how closely the core meaning and obligations match, even if wording changed>,
  "executiveSummary": "<2-3 sentence clear summary of the core differences, what was added/removed, and the overall impact>",
  "keySemanticChanges": [
    "<specific bullet point 1 explaining a meaningful change (e.g. altered prices, dates, liability, names)>",
    "<specific bullet point 2>",
    "<specific bullet point 3>"
  ],
  "criticalAlerts": [
    "<any high-risk changes, removed clauses, or major discrepancies. Empty array if none>"
  ],
  "toneShift": "<description of any tone or style shift (e.g. 'Shifted from collaborative to strict legal language' or 'No significant tone shift')>"
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
