import * as Diff from 'diff';

/**
 * Tokenize text into words (alphanumeric sequences and standard punctuation)
 */
function tokenizeWords(text) {
  if (!text) return [];
  return text.trim().split(/\s+/).filter(Boolean);
}

/**
 * Calculate exact lexical similarity percentage using Sørensen-Dice coefficient on word tokens
 * Formula: (2 * unchangedWords) / (wordsA + wordsB) * 100
 */
export function calculateWordSimilarity(textA, textB, wordDiffs) {
  const wordsA = tokenizeWords(textA);
  const wordsB = tokenizeWords(textB);

  if (wordsA.length === 0 && wordsB.length === 0) return 100;
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  let unchangedWordsCount = 0;
  let addedWordsCount = 0;
  let deletedWordsCount = 0;

  for (const part of wordDiffs) {
    const partWords = tokenizeWords(part.value).length;
    if (part.added) {
      addedWordsCount += partWords;
    } else if (part.removed) {
      deletedWordsCount += partWords;
    } else {
      unchangedWordsCount += partWords;
    }
  }

  const totalWords = wordsA.length + wordsB.length;
  const similarityScore = totalWords > 0 
    ? Math.round(((2 * unchangedWordsCount) / totalWords) * 1000) / 10 
    : 0;

  return {
    similarityPercent: Math.min(100, Math.max(0, similarityScore)),
    totalWordsA: wordsA.length,
    totalWordsB: wordsB.length,
    unchangedWords: unchangedWordsCount,
    addedWords: addedWordsCount,
    deletedWords: deletedWordsCount
  };
}

/**
 * Compare two documents section by section (Pages, Slides, or Sheets)
 */
function compareSections(sectionsA = [], sectionsB = []) {
  const maxLen = Math.max(sectionsA.length, sectionsB.length);
  const sectionReports = [];

  for (let i = 0; i < maxLen; i++) {
    const secA = sectionsA[i];
    const secB = sectionsB[i];

    if (secA && secB) {
      const title = secA.title === secB.title ? secA.title : `${secA.title} vs ${secB.title}`;
      if (secA.content.trim() === secB.content.trim()) {
        sectionReports.push({
          index: i + 1,
          title,
          status: 'UNCHANGED',
          similarityPercent: 100,
          description: 'Identical content'
        });
      } else {
        const diffs = Diff.diffWords(secA.content, secB.content);
        const stats = calculateWordSimilarity(secA.content, secB.content, diffs);
        sectionReports.push({
          index: i + 1,
          title,
          status: 'MODIFIED',
          similarityPercent: stats.similarityPercent,
          description: `${stats.addedWords} words added, ${stats.deletedWords} words removed`
        });
      }
    } else if (secA && !secB) {
      sectionReports.push({
        index: i + 1,
        title: secA.title,
        status: 'DELETED',
        similarityPercent: 0,
        description: 'Section exists only in Document A (Removed in Document B)'
      });
    } else if (!secA && secB) {
      sectionReports.push({
        index: i + 1,
        title: secB.title,
        status: 'ADDED',
        similarityPercent: 0,
        description: 'New section added in Document B'
      });
    }
  }

  return sectionReports;
}

/**
 * Generate a descriptive classification badge and human-readable summary
 */
function generateSummaryDescription(similarityPercent, stats, sectionReports) {
  let category = 'IDENTICAL';
  let badgeColor = 'green';
  let headline = '';

  if (similarityPercent === 100) {
    category = 'IDENTICAL';
    badgeColor = 'emerald';
    headline = 'The two documents are 100% word-for-word identical.';
  } else if (similarityPercent >= 90) {
    category = 'MINOR_EDITS';
    badgeColor = 'blue';
    headline = `Minor revisions detected (${similarityPercent}% match). Content is largely intact with small adjustments.`;
  } else if (similarityPercent >= 60) {
    category = 'MODERATE_CHANGES';
    badgeColor = 'amber';
    headline = `Moderate modifications detected (${similarityPercent}% match). Multiple sentences or sections were updated.`;
  } else if (similarityPercent >= 25) {
    category = 'MAJOR_REVISION';
    badgeColor = 'orange';
    headline = `Significant rewrite detected (${similarityPercent}% match). Substantial differences in content and structure.`;
  } else {
    category = 'COMPLETELY_DIFFERENT';
    badgeColor = 'rose';
    headline = `Very low similarity (${similarityPercent}% match). These appear to be different documents or almost fully rewritten.`;
  }

  const modifiedSections = sectionReports.filter(s => s.status === 'MODIFIED');
  const addedSections = sectionReports.filter(s => s.status === 'ADDED');
  const deletedSections = sectionReports.filter(s => s.status === 'DELETED');

  const keyPoints = [];
  if (stats.addedWords > 0) keyPoints.push(`+${stats.addedWords} words added`);
  if (stats.deletedWords > 0) keyPoints.push(`-${stats.deletedWords} words removed`);
  if (modifiedSections.length > 0) keyPoints.push(`${modifiedSections.length} sections modified`);
  if (addedSections.length > 0) keyPoints.push(`${addedSections.length} new sections added`);
  if (deletedSections.length > 0) keyPoints.push(`${deletedSections.length} sections removed`);

  return {
    category,
    badgeColor,
    headline,
    keyPoints,
    statsDescription: `Document A (${stats.totalWordsA} words) vs Document B (${stats.totalWordsB} words): ${stats.unchangedWords} matching words.`
  };
}

/**
 * Compare two extracted document objects
 * @param {Object} docA - Extracted content of Document A { text, sections, format, filename }
 * @param {Object} docB - Extracted content of Document B { text, sections, format, filename }
 */
export function compareDocuments(docA, docB) {
  const textA = docA.text || '';
  const textB = docB.text || '';

  // 1. Detailed Word-level Diffs with whitespace preservation
  const wordDiffs = Diff.diffWordsWithSpace(textA, textB);

  // Format diff tokens for easy frontend rendering
  const formattedDiffs = wordDiffs.map(part => ({
    value: part.value,
    type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged'
  }));

  // 2. Compute similarity stats & percentages
  const stats = calculateWordSimilarity(textA, textB, wordDiffs);

  // 3. Section by section comparison
  const sectionReports = compareSections(docA.sections, docB.sections);

  // 4. Generate local structured summary
  const summary = generateSummaryDescription(stats.similarityPercent, stats, sectionReports);

  return {
    isIdentical: stats.similarityPercent === 100,
    similarityPercent: stats.similarityPercent,
    stats,
    summary,
    sectionReports,
    diffTokens: formattedDiffs,
    meta: {
      docA: { filename: docA.filename, format: docA.format, wordCount: docA.wordCount },
      docB: { filename: docB.filename, format: docB.format, wordCount: docB.wordCount }
    }
  };
}
