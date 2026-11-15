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
/**
 * Calculate exact lexical similarity percentage using Sørensen-Dice coefficient on word tokens
 * Formula: (2 * unchangedWords) / (wordsA + wordsB) * 100
 */
export function calculateWordSimilarity(textA, textB, wordDiffs) {
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

  const wordsInA = unchangedWordsCount + deletedWordsCount;
  const wordsInB = unchangedWordsCount + addedWordsCount;
  const totalWords = wordsInA + wordsInB;

  if (totalWords === 0) {
    return {
      similarityPercent: 100,
      totalWordsA: 0,
      totalWordsB: 0,
      unchangedWords: 0,
      addedWords: 0,
      deletedWords: 0
    };
  }

  const similarityScore = (addedWordsCount === 0 && deletedWordsCount === 0)
    ? 100
    : Math.round(((2 * unchangedWordsCount) / totalWords) * 1000) / 10;

  return {
    similarityPercent: Math.min(100, Math.max(0, similarityScore)),
    totalWordsA: wordsInA,
    totalWordsB: wordsInB,
    unchangedWords: unchangedWordsCount,
    addedWords: addedWordsCount,
    deletedWords: deletedWordsCount
  };
}

/**
 * Compute lexical token similarity between two section contents
 */
function computeSectionSimilarity(textA = '', textB = '') {
  const tA = textA.trim();
  const tB = textB.trim();
  if (tA === tB) return 1.0;
  if (!tA || !tB) return 0.0;

  const wordsA = tokenizeWords(tA.toLowerCase());
  const wordsB = tokenizeWords(tB.toLowerCase());
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
  return (2 * common) / (wordsA.length + wordsB.length || 1);
}

/**
 * Multi-Pass Section & Slide Alignment Engine:
 * 1. Computes all-pairs similarity matrix across all pages/slides in both documents
 * 2. Uses Needleman-Wunsch DP for sequence alignment (insertions/deletions/edits in reading order)
 * 3. Second-Pass Relocation Scanner: Detects moved slides (e.g. Slide 2 moved to Slide 15)
 *    and prevents false "deleted + re-added" reports.
 */
function compareSections(sectionsA = [], sectionsB = []) {
  const n = sectionsA.length;
  const m = sectionsB.length;

  if (n === 0 && m === 0) return [];
  if (n === 0) {
    return sectionsB.map((s, idx) => ({
      index: idx + 1,
      title: s.title,
      titleA: null,
      titleB: s.title,
      status: 'ADDED',
      similarityPercent: 0,
      description: 'New section added in Document B',
      contentA: '',
      contentB: s.content,
      stats: { totalWordsA: 0, totalWordsB: tokenizeWords(s.content).length, addedWords: tokenizeWords(s.content).length, deletedWords: 0, unchangedWords: 0 },
      diffTokens: [{ value: s.content, type: 'added' }]
    }));
  }
  if (m === 0) {
    return sectionsA.map((s, idx) => ({
      index: idx + 1,
      title: s.title,
      titleA: s.title,
      titleB: null,
      status: 'DELETED',
      similarityPercent: 0,
      description: 'Section removed in Document B',
      contentA: s.content,
      contentB: '',
      stats: { totalWordsA: tokenizeWords(s.content).length, totalWordsB: 0, addedWords: 0, deletedWords: tokenizeWords(s.content).length, unchangedWords: 0 },
      diffTokens: [{ value: s.content, type: 'removed' }]
    }));
  }

  // Preserve original indices for relocation tracking
  const taggedA = sectionsA.map((s, idx) => ({ ...s, _idx: idx }));
  const taggedB = sectionsB.map((s, idx) => ({ ...s, _idx: idx }));

  // 1. Build all-pairs similarity matrix between every section pair (A_i, B_j)
  const simMatrix = Array.from({ length: n }, () => new Float32Array(m));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      simMatrix[i][j] = computeSectionSimilarity(taggedA[i].content, taggedB[j].content);
    }
  }

  // 2. Phase 1: Dynamic programming with Needleman-Wunsch global sequence alignment
  const GAP_PENALTY = -0.30;
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
      // Reward matching pairs (>= 0.35); penalize incompatible pairs (< 0.35)
      const matchScore = sim >= 0.35 ? (sim * 2.0 - 0.2) : -1.0;

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

  // Backtrack to recover alignment
  let bi = n, bj = m;
  const rawPairs = [];
  while (bi > 0 || bj > 0) {
    if (bi > 0 && bj > 0 && trace[bi][bj] === 1) {
      rawPairs.push({ a: taggedA[bi - 1], b: taggedB[bj - 1] });
      bi--;
      bj--;
    } else if (bi > 0 && (bj === 0 || trace[bi][bj] === 2)) {
      rawPairs.push({ a: taggedA[bi - 1], b: null });
      bi--;
    } else {
      rawPairs.push({ a: null, b: taggedB[bj - 1] });
      bj--;
    }
  }
  rawPairs.reverse();

  // Separate in-sequence matches from unmatched candidates
  const inSequencePairs = [];
  const unmatchedA = [];
  const unmatchedB = [];

  for (const pair of rawPairs) {
    if (pair.a && pair.b) {
      const sim = simMatrix[pair.a._idx][pair.b._idx];
      if (sim >= 0.35) {
        inSequencePairs.push(pair);
      } else {
        unmatchedA.push(pair.a);
        unmatchedB.push(pair.b);
      }
    } else if (pair.a && !pair.b) {
      unmatchedA.push(pair.a);
    } else if (!pair.a && pair.b) {
      unmatchedB.push(pair.b);
    }
  }

  // 3. Phase 2: Relocation / Moved Matching across unmatched candidates
  const moveCandidates = [];
  for (const a of unmatchedA) {
    for (const b of unmatchedB) {
      const sim = simMatrix[a._idx][b._idx];
      if (sim >= 0.60) {
        moveCandidates.push({ a, b, sim, dist: Math.abs(a._idx - b._idx) });
      }
    }
  }

  // Sort candidate moves: highest similarity first, then closest distance
  moveCandidates.sort((x, y) => {
    if (y.sim !== x.sim) return y.sim - x.sim;
    return x.dist - y.dist;
  });

  const claimedA = new Set();
  const claimedB = new Set();
  const movedPairs = [];

  for (const cand of moveCandidates) {
    if (!claimedA.has(cand.a._idx) && !claimedB.has(cand.b._idx)) {
      claimedA.add(cand.a._idx);
      claimedB.add(cand.b._idx);
      movedPairs.push({ a: cand.a, b: cand.b, isMoved: true });
    }
  }

  const deletedA = unmatchedA.filter(a => !claimedA.has(a._idx));
  const addedB = unmatchedB.filter(b => !claimedB.has(b._idx));

  // Extract clear human-readable snippet explaining the exact changes
  function summarizeDiffTokens(diffTokens = []) {
    const removedParts = [];
    const addedParts = [];

    for (let i = 0; i < diffTokens.length; i++) {
      const t = diffTokens[i];
      if (t.type === 'removed' && t.value.trim()) {
        removedParts.push(t.value.trim());
      } else if (t.type === 'added' && t.value.trim()) {
        addedParts.push(t.value.trim());
      }
    }

    if (removedParts.length === 0 && addedParts.length === 0) {
      return null;
    }

    // Detect numerical / currency changes (e.g. $10 -> $15)
    const numRegex = /[\$€£¥]?\b\d+(?:[\.,]\d+)?%?/g;
    const remNums = removedParts.join(' ').match(numRegex) || [];
    const addNums = addedParts.join(' ').match(numRegex) || [];

    if (remNums.length > 0 && addNums.length > 0) {
      return `Updated values: "${remNums.slice(0, 2).join(', ')}" ➔ "${addNums.slice(0, 2).join(', ')}"`;
    }

    if (removedParts.length > 0 && addedParts.length > 0) {
      const remSnippet = removedParts.slice(0, 2).join(' ');
      const addSnippet = addedParts.slice(0, 2).join(' ');
      const remClean = remSnippet.length > 25 ? remSnippet.slice(0, 22) + '...' : remSnippet;
      const addClean = addSnippet.length > 25 ? addSnippet.slice(0, 22) + '...' : addSnippet;
      return `Replaced "${remClean}" with "${addClean}"`;
    }

    if (addedParts.length > 0) {
      const addSnippet = addedParts.slice(0, 2).join(' ');
      const addClean = addSnippet.length > 32 ? addSnippet.slice(0, 29) + '...' : addSnippet;
      return `Added "${addClean}"`;
    }

    if (removedParts.length > 0) {
      const remSnippet = removedParts.slice(0, 2).join(' ');
      const remClean = remSnippet.length > 32 ? remSnippet.slice(0, 29) + '...' : remSnippet;
      return `Removed "${remClean}"`;
    }

    return null;
  }

  // Helper to format detailed report object for a pair
  function createSectionReport(secA, secB, isMoved = false) {
    if (secA && secB) {
      const isExact = secA.content.trim() === secB.content.trim();
      const diffs = Diff.diffWords(secA.content, secB.content);
      const diffsWithSpace = Diff.diffWordsWithSpace(secA.content, secB.content);
      const stats = calculateWordSimilarity(secA.content, secB.content, diffs);

      let status = isMoved 
        ? 'MOVED' 
        : (isExact || (stats.addedWords === 0 && stats.deletedWords === 0) ? 'UNCHANGED' : 'MODIFIED');

      let title = isMoved
        ? `${secA.title} ➔ ${secB.title}`
        : (secA.title === secB.title ? secA.title : `${secA.title} ↔ ${secB.title}`);

      const smartPreview = summarizeDiffTokens(diffsWithSpace);

      let description = '';
      if (isMoved) {
        if (isExact || (stats.addedWords === 0 && stats.deletedWords === 0)) {
          description = `Moved from ${secA.title} to ${secB.title} (Identical content)`;
        } else {
          description = `Moved from ${secA.title} to ${secB.title}${smartPreview ? ` • ${smartPreview}` : ` (+${stats.addedWords}, -${stats.deletedWords} words)`}`;
        }
      } else if (status === 'UNCHANGED') {
        description = 'Identical content';
      } else {
        description = smartPreview 
          ? `${smartPreview} (+${stats.addedWords}, -${stats.deletedWords} words)`
          : `${stats.addedWords} words added, ${stats.deletedWords} words removed`;
      }

      const similarityPercent = status === 'UNCHANGED' ? 100 : stats.similarityPercent;

      return {
        title,
        titleA: secA.title,
        titleB: secB.title,
        status,
        similarityPercent,
        description,
        movedFrom: isMoved ? secA.title : null,
        movedTo: isMoved ? secB.title : null,
        contentA: secA.content,
        contentB: secB.content,
        stats: {
          ...stats,
          similarityPercent
        },
        diffTokens: diffsWithSpace.map(p => ({
          value: p.value,
          type: p.added ? 'added' : p.removed ? 'removed' : 'unchanged'
        }))
      };
    } else if (secA && !secB) {
      const wordsCount = tokenizeWords(secA.content).length;
      const previewA = secA.content.trim().slice(0, 35);
      const cleanPrev = previewA ? ` (was: "${previewA}${secA.content.length > 35 ? '...' : ''}")` : '';
      return {
        title: secA.title,
        titleA: secA.title,
        titleB: null,
        status: 'DELETED',
        similarityPercent: 0,
        description: `Section removed in Document B${cleanPrev}`,
        movedFrom: null,
        movedTo: null,
        contentA: secA.content,
        contentB: '',
        stats: {
          totalWordsA: wordsCount,
          totalWordsB: 0,
          addedWords: 0,
          deletedWords: wordsCount,
          unchangedWords: 0,
          similarityPercent: 0
        },
        diffTokens: [{ value: secA.content, type: 'removed' }]
      };
    } else {
      const wordsCount = tokenizeWords(secB.content).length;
      const previewB = secB.content.trim().slice(0, 35);
      const cleanPrev = previewB ? ` ("${previewB}${secB.content.length > 35 ? '...' : ''}")` : '';
      return {
        title: secB.title,
        titleA: null,
        titleB: secB.title,
        status: 'ADDED',
        similarityPercent: 0,
        description: `New section added in Document B${cleanPrev}`,
        movedFrom: null,
        movedTo: null,
        contentA: '',
        contentB: secB.content,
        stats: {
          totalWordsA: 0,
          totalWordsB: wordsCount,
          addedWords: wordsCount,
          deletedWords: 0,
          unchangedWords: 0,
          similarityPercent: 0
        },
        diffTokens: [{ value: secB.content, type: 'added' }]
      };
    }
  }

  // 4. Assemble final section reports in natural reading order
  const aReports = [];
  for (const a of taggedA) {
    const inSeq = inSequencePairs.find(p => p.a._idx === a._idx);
    if (inSeq) {
      aReports.push({ rep: createSectionReport(inSeq.a, inSeq.b, false), origA: a._idx });
      continue;
    }
    const moved = movedPairs.find(p => p.a._idx === a._idx);
    if (moved) {
      aReports.push({ rep: createSectionReport(moved.a, moved.b, true), origA: a._idx });
      continue;
    }
    const del = deletedA.find(x => x._idx === a._idx);
    if (del) {
      aReports.push({ rep: createSectionReport(del, null, false), origA: a._idx });
    }
  }

  // Truly added sections from Document B
  const bReports = addedB.map(b => ({
    rep: createSectionReport(null, b, false),
    origB: b._idx
  }));

  const finalReports = [...aReports.map(x => x.rep), ...bReports.map(x => x.rep)];
  return finalReports.map((r, idx) => ({ index: idx + 1, ...r }));
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
  const movedSections = sectionReports.filter(s => s.status === 'MOVED');
  const addedSections = sectionReports.filter(s => s.status === 'ADDED');
  const deletedSections = sectionReports.filter(s => s.status === 'DELETED');

  const keyPoints = [];
  if (stats.addedWords > 0) keyPoints.push(`+${stats.addedWords} words added`);
  if (stats.deletedWords > 0) keyPoints.push(`-${stats.deletedWords} words removed`);
  if (movedSections.length > 0) keyPoints.push(`${movedSections.length} ${movedSections.length === 1 ? 'section' : 'sections'} moved / relocated`);
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
