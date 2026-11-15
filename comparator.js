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
 * Optimal Global Alignment of Sections (Needleman-Wunsch DP)
 * Prevents off-by-one cascading mismatches when slides/pages are inserted or deleted.
 */
function compareSections(sectionsA = [], sectionsB = []) {
  const n = sectionsA.length;
  const m = sectionsB.length;

  if (n === 0 && m === 0) return [];
  if (n === 0) {
    return sectionsB.map((s, idx) => ({
      index: idx + 1,
      title: s.title,
      status: 'ADDED',
      similarityPercent: 0,
      description: 'New section added in Document B'
    }));
  }
  if (m === 0) {
    return sectionsA.map((s, idx) => ({
      index: idx + 1,
      title: s.title,
      status: 'DELETED',
      similarityPercent: 0,
      description: 'Section removed in Document B'
    }));
  }

  // 1. Build similarity matrix between all section pairs (A_i, B_j)
  const simMatrix = Array.from({ length: n }, () => new Float32Array(m));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const textA = sectionsA[i].content.trim();
      const textB = sectionsB[j].content.trim();
      if (textA === textB) {
        simMatrix[i][j] = 1.0;
      } else if (!textA || !textB) {
        simMatrix[i][j] = 0.0;
      } else {
        const wordsA = tokenizeWords(textA.toLowerCase());
        const wordsB = tokenizeWords(textB.toLowerCase());
        const setA = new Map();
        for (const w of wordsA) setA.set(w, (setA.get(w) || 0) + 1);
        let common = 0;
        for (const w of wordsB) {
          const count = setA.get(w) || 0;
          if (count > 0) {
            common++;
            setA.set(w, count - 1);
          }
        }
        simMatrix[i][j] = (2 * common) / (wordsA.length + wordsB.length || 1);
      }
    }
  }

  // 2. Dynamic programming with Needleman-Wunsch global alignment
  const GAP_PENALTY = -0.15;
  const dp = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
  const trace = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1)); // 1=diag, 2=up (gap in B), 3=left (gap in A)

  for (let i = 1; i <= n; i++) {
    dp[i][0] = i * GAP_PENALTY;
    trace[i][0] = 2;
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = j * GAP_PENALTY;
    trace[0][j] = 3;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sim = simMatrix[i - 1][j - 1];
      // Reward matching pairs; penalize low-similarity pairs
      const matchScore = sim >= 0.25 ? (sim * 2.0 - 0.2) : (sim - 0.6);

      const diag = dp[i - 1][j - 1] + matchScore;
      const up = dp[i - 1][j] + GAP_PENALTY;
      const left = dp[i][j - 1] + GAP_PENALTY;

      if (diag >= up && diag >= left) {
        dp[i][j] = diag;
        trace[i][j] = 1;
      } else if (up >= left) {
        dp[i][j] = up;
        trace[i][j] = 2;
      } else {
        dp[i][j] = left;
        trace[i][j] = 3;
      }
    }
  }

  // 3. Backtrack to recover optimal alignment
  let i = n, j = m;
  const alignedPairs = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && trace[i][j] === 1) {
      alignedPairs.push({ secA: sectionsA[i - 1], secB: sectionsB[j - 1] });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || trace[i][j] === 2)) {
      alignedPairs.push({ secA: sectionsA[i - 1], secB: null });
      i--;
    } else {
      alignedPairs.push({ secA: null, secB: sectionsB[j - 1] });
      j--;
    }
  }
  alignedPairs.reverse();

  // 4. Construct Section Reports with precise diff stats
  const sectionReports = [];
  for (let k = 0; k < alignedPairs.length; k++) {
    const { secA, secB } = alignedPairs[k];

    if (secA && secB) {
      const isExact = secA.content.trim() === secB.content.trim();
      const title = secA.title === secB.title ? secA.title : `${secA.title} ↔ ${secB.title}`;

      if (isExact) {
        sectionReports.push({
          index: k + 1,
          title,
          titleA: secA.title,
          titleB: secB.title,
          status: 'UNCHANGED',
          similarityPercent: 100,
          description: 'Identical content',
          contentA: secA.content,
          contentB: secB.content,
          stats: {
            totalWordsA: tokenizeWords(secA.content).length,
            totalWordsB: tokenizeWords(secB.content).length,
            addedWords: 0,
            deletedWords: 0,
            unchangedWords: tokenizeWords(secA.content).length
          },
          diffTokens: [{ value: secA.content, type: 'unchanged' }]
        });
      } else {
        const diffs = Diff.diffWords(secA.content, secB.content);
        const diffsWithSpace = Diff.diffWordsWithSpace(secA.content, secB.content);
        const stats = calculateWordSimilarity(secA.content, secB.content, diffs);

        // If word counts show 0 added and 0 deleted, the words are identical (only minor whitespace variance)
        if (stats.addedWords === 0 && stats.deletedWords === 0) {
          sectionReports.push({
            index: k + 1,
            title,
            titleA: secA.title,
            titleB: secB.title,
            status: 'UNCHANGED',
            similarityPercent: 100,
            description: 'Identical content',
            contentA: secA.content,
            contentB: secB.content,
            stats: {
              ...stats,
              similarityPercent: 100
            },
            diffTokens: [{ value: secB.content, type: 'unchanged' }]
          });
        } else {
          sectionReports.push({
            index: k + 1,
            title,
            titleA: secA.title,
            titleB: secB.title,
            status: 'MODIFIED',
            similarityPercent: stats.similarityPercent,
            description: `${stats.addedWords} words added, ${stats.deletedWords} words removed`,
            contentA: secA.content,
            contentB: secB.content,
            stats,
            diffTokens: diffsWithSpace.map(p => ({
              value: p.value,
              type: p.added ? 'added' : p.removed ? 'removed' : 'unchanged'
            }))
          });
        }
      }
    } else if (secA && !secB) {
      const wordsCount = tokenizeWords(secA.content).length;
      sectionReports.push({
        index: k + 1,
        title: secA.title,
        titleA: secA.title,
        titleB: null,
        status: 'DELETED',
        similarityPercent: 0,
        description: 'Section exists in Document A (Removed in Document B)',
        contentA: secA.content,
        contentB: '',
        stats: {
          totalWordsA: wordsCount,
          totalWordsB: 0,
          addedWords: 0,
          deletedWords: wordsCount,
          unchangedWords: 0
        },
        diffTokens: [{ value: secA.content, type: 'removed' }]
      });
    } else if (!secA && secB) {
      const wordsCount = tokenizeWords(secB.content).length;
      sectionReports.push({
        index: k + 1,
        title: secB.title,
        titleA: null,
        titleB: secB.title,
        status: 'ADDED',
        similarityPercent: 0,
        description: 'New section added in Document B',
        contentA: '',
        contentB: secB.content,
        stats: {
          totalWordsA: 0,
          totalWordsB: wordsCount,
          addedWords: wordsCount,
          deletedWords: 0,
          unchangedWords: 0
        },
        diffTokens: [{ value: secB.content, type: 'added' }]
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
