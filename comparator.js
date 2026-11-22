/**
 * ============================================================================
 * Core Document Comparison & Diffing Engine
 * ============================================================================
 * Pipeline Architecture:
 *  1. Noise Filtering     : Case, punctuation, numbers, whitespace normalization.
 *  2. Tokenization & Diff : Myers diff algorithm at word-level with spacing preservation.
 *  3. Similarity Metric   : Sørensen-Dice coefficient: (2 * |A ∩ B|) / (|A| + |B|) * 100.
 *  4. Section Alignment   : Categorizes blocks as UNCHANGED, MODIFIED, ADDED, DELETED, or MOVED.
 *  5. Spreadsheet Matrix  : Cell-by-cell coordinate comparison for tabular sheets.
 * ============================================================================
 */

import * as Diff from 'diff';

/**
 * Smart Noise Filtering Utility:
 * Pre-processes text based on user-selected filtering options:
 * - ignoreCase: Handled in Diff engine ({ ignoreCase: true })
 * - ignoreWhitespace: Collapses multiple spaces, tabs, and trims empty lines
 * - ignorePunctuation: Replaces punctuation with space so adjacent words don't merge
 * - ignoreNumbers: Masks standalone numbers, currency, and dates so numeric changes are ignored
 * - trimLines: Trims whitespace from start and end of every line
 */
export function filterText(text = '', options = {}) {
  if (!text) return '';
  let res = String(text);

  // 1. Normalize line endings (\r\n -> \n)
  res = res.replace(/\r\n/g, '\n');

  // 2. Ignore Numbers & Dates
  if (options.ignoreNumbers) {
    // Matches currency amounts, standalone numbers, decimals, percentages, dates
    res = res.replace(/[$€£¥]?\b\d+(?:[.,/]\d+)*%?\b/g, '[#NUM]');
  }

  // 3. Ignore Punctuation
  if (options.ignorePunctuation) {
    res = res.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’“”«»[\]{}]/g, ' ');
  }

  // 4. Ignore Whitespace / Normalize Whitespace
  if (options.ignoreWhitespace) {
    res = res.replace(/[ \t]+/g, ' ')
             .replace(/ *\n */g, '\n')
             .replace(/\n{2,}/g, '\n')
             .trim();
  }

  // 5. Trim Lines
  if (options.trimLines) {
    res = res.split('\n').map(line => line.trim()).filter(Boolean).join('\n');
  }

  return res;
}

/**
 * Tokenize text into words (alphanumeric sequences and standard punctuation)
 */
function tokenizeWords(text) {
  if (!text) return [];
  return text.trim().split(/\s+/).filter(Boolean);
}

/**
 * Safe word diff that protects against O(N^2) Myers diff explosion on large texts.
 * If text is within reasonable size (< 15,000 chars), runs standard Diff.diffWordsWithSpace.
 * For massive texts or divergent files, uses chunked diffing to guarantee near-instant execution.
 */
export function safeWordDiff(valA = '', valB = '', diffOpts = {}) {
  const lenA = (valA || '').length;
  const lenB = (valB || '').length;

  if (lenA === 0 && lenB === 0) return [];
  if (lenA === 0) return [{ value: valB, added: true }];
  if (lenB === 0) return [{ value: valA, removed: true }];

  // Fast path: direct word diff if under 15k characters
  if (lenA + lenB < 15000) {
    return Diff.diffWordsWithSpace(valA, valB, diffOpts);
  }

  const linesA = valA.split('\n');
  const linesB = valB.split('\n');

  // If either has more than 40 lines, chunk by 25 lines to prevent quadratic slowdown
  if (linesA.length > 40 || linesB.length > 40) {
    const CHUNK = 25;
    const chunks = [];
    const maxLen = Math.max(linesA.length, linesB.length);
    for (let i = 0; i < maxLen; i += CHUNK) {
      const subA = linesA.slice(i, i + CHUNK).join('\n');
      const subB = linesB.slice(i, i + CHUNK).join('\n');
      if (subA && subB) {
        chunks.push(...Diff.diffWordsWithSpace(subA, subB, diffOpts));
        if (i + CHUNK < maxLen) chunks.push({ value: '\n' });
      } else if (subA) {
        chunks.push({ value: subA, removed: true });
        if (i + CHUNK < maxLen) chunks.push({ value: '\n' });
      } else if (subB) {
        chunks.push({ value: subB, added: true });
        if (i + CHUNK < maxLen) chunks.push({ value: '\n' });
      }
    }
    return chunks;
  }

  return Diff.diffWordsWithSpace(valA, valB, diffOpts);
}

/**
 * High-performance hybrid diff for full-document comparison.
 * Uses line-level diffing to anchor matching blocks in O(lines) time,
 * then applies safeWordDiff only on modified regions.
 */
export function hybridDiffWords(textA = '', textB = '', diffOpts = {}) {
  if (!textA && !textB) return [];
  if (!textA) return [{ value: textB, added: true }];
  if (!textB) return [{ value: textA, removed: true }];

  // Direct fast path for small/medium documents (< 15,000 characters)
  if (textA.length + textB.length < 15000) {
    return Diff.diffWordsWithSpace(textA, textB, diffOpts);
  }

  // Hierarchical Line-Anchored Diffing for large documents (e.g. 50+ page PDFs)
  const lineParts = Diff.diffLines(textA, textB, diffOpts);
  const result = [];

  for (let i = 0; i < lineParts.length; i++) {
    const part = lineParts[i];
    const next = lineParts[i + 1];

    if (part.removed && next && next.added) {
      // Pair removed and added blocks for fine-grained word diff
      result.push(...safeWordDiff(part.value, next.value, diffOpts));
      i++; // Skip paired next
    } else if (part.removed) {
      result.push({ value: part.value, removed: true });
    } else if (part.added) {
      result.push({ value: part.value, added: true });
    } else {
      result.push({ value: part.value });
    }
  }

  return result;
}

/**
 * Calculate exact lexical similarity percentage using Sørensen-Dice coefficient on word tokens
 * Formula: (2 * unchangedWords) / (wordsA + wordsB) * 100
 * When ignoreWhitespace is false, whitespace differences are factored into similarity and stats.
 */
export function calculateWordSimilarity(textA, textB, wordDiffs, filterOpts = {}) {
  let unchangedWordsCount = 0;
  let addedWordsCount = 0;
  let deletedWordsCount = 0;
  let addedWhitespaceCount = 0;
  let deletedWhitespaceCount = 0;

  for (const part of wordDiffs) {
    const partWords = tokenizeWords(part.value).length;
    if (part.added) {
      if (partWords > 0) {
        addedWordsCount += partWords;
      } else if (/\s/.test(part.value)) {
        addedWhitespaceCount += part.value.length;
      }
    } else if (part.removed) {
      if (partWords > 0) {
        deletedWordsCount += partWords;
      } else if (/\s/.test(part.value)) {
        deletedWhitespaceCount += part.value.length;
      }
    } else {
      unchangedWordsCount += partWords;
    }
  }

  const wordsInA = unchangedWordsCount + deletedWordsCount;
  const wordsInB = unchangedWordsCount + addedWordsCount;
  const totalWords = wordsInA + wordsInB;
  const hasWhitespaceChanges = (addedWhitespaceCount > 0 || deletedWhitespaceCount > 0);

  if (totalWords === 0) {
    return {
      similarityPercent: (hasWhitespaceChanges && !filterOpts.ignoreWhitespace) ? 0 : 100,
      totalWordsA: 0,
      totalWordsB: 0,
      unchangedWords: 0,
      addedWords: 0,
      deletedWords: 0,
      whitespaceChanges: !filterOpts.ignoreWhitespace ? (addedWhitespaceCount + deletedWhitespaceCount) : 0,
      addedWhitespace: !filterOpts.ignoreWhitespace ? addedWhitespaceCount : 0,
      deletedWhitespace: !filterOpts.ignoreWhitespace ? deletedWhitespaceCount : 0
    };
  }

  let similarityScore;
  if (addedWordsCount === 0 && deletedWordsCount === 0) {
    if (hasWhitespaceChanges && !filterOpts.ignoreWhitespace) {
      // Wording is identical, but whitespace has changed and spaces matter
      const charsA = (textA || '').length;
      const charsB = (textB || '').length;
      const unchangedChars = Math.max(0, Math.min(charsA, charsB) - deletedWhitespaceCount);
      const charDice = (2 * unchangedChars) / (charsA + charsB || 1);
      // Strictly below 100% since whitespace differences are detected
      similarityScore = Math.min(99.9, Math.round(charDice * 1000) / 10);
    } else {
      similarityScore = 100;
    }
  } else {
    const baseScore = ((2 * unchangedWordsCount) / totalWords) * 100;
    if (hasWhitespaceChanges && !filterOpts.ignoreWhitespace) {
      const wsPenalty = Math.min(5, (addedWhitespaceCount + deletedWhitespaceCount) * 0.2);
      similarityScore = Math.round(Math.max(0, baseScore - wsPenalty) * 10) / 10;
    } else {
      similarityScore = Math.round(baseScore * 10) / 10;
    }
  }

  return {
    similarityPercent: Math.min(100, Math.max(0, similarityScore)),
    totalWordsA: wordsInA,
    totalWordsB: wordsInB,
    unchangedWords: unchangedWordsCount,
    addedWords: addedWordsCount,
    deletedWords: deletedWordsCount,
    whitespaceChanges: (!filterOpts.ignoreWhitespace ? (addedWhitespaceCount + deletedWhitespaceCount) : 0),
    addedWhitespace: (!filterOpts.ignoreWhitespace ? addedWhitespaceCount : 0),
    deletedWhitespace: (!filterOpts.ignoreWhitespace ? deletedWhitespaceCount : 0)
  };
}

/**
 * Prepares section metadata for blazing fast all-pairs alignment matrix.
 * Filters text once, tokenizes once, and precomputes word frequency counts.
 */
function prepareSectionMeta(section, filterOpts) {
  const filtered = filterText(section.content || '', filterOpts);
  const norm = filterOpts.ignoreWhitespace ? filtered.trim() : filtered;
  const matchKey = filterOpts.ignoreCase ? norm.toLowerCase() : norm;
  const words = tokenizeWords(matchKey);
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return {
    ...section,
    filtered,
    matchKey,
    wordsCount: words.length,
    freq
  };
}

/**
 * High-speed token similarity between pre-indexed section metadata
 */
function fastSectionSimilarity(metaA, metaB) {
  if (metaA.matchKey === metaB.matchKey) return 1.0;
  if (!metaA.wordsCount || !metaB.wordsCount) return 0.0;

  const [small, large] = metaA.freq.size <= metaB.freq.size
    ? [metaA.freq, metaB.freq]
    : [metaB.freq, metaA.freq];

  let common = 0;
  for (const [word, countA] of small.entries()) {
    const countB = large.get(word);
    if (countB) {
      common += Math.min(countA, countB);
    }
  }
  return (2 * common) / (metaA.wordsCount + metaB.wordsCount);
}

/**
 * Multi-Pass Section & Slide Alignment Engine:
 * 1. Computes all-pairs similarity matrix across all pages/slides in both documents
 * 2. Uses Needleman-Wunsch DP for sequence alignment (insertions/deletions/edits in reading order)
 * 3. Second-Pass Relocation Scanner: Detects moved slides (e.g. Slide 2 moved to Slide 15)
 *    and prevents false "deleted + re-added" reports.
 */
function compareSections(sectionsA = [], sectionsB = [], filterOpts = {}) {
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

  // Preserve original indices and precompute section metadata for high-speed matrix alignment
  const taggedA = sectionsA.map((s, idx) => prepareSectionMeta({ ...s, _idx: idx }, filterOpts));
  const taggedB = sectionsB.map((s, idx) => prepareSectionMeta({ ...s, _idx: idx }, filterOpts));

  // 1. Build all-pairs similarity matrix between every section pair (A_i, B_j) in ~1ms
  const simMatrix = Array.from({ length: n }, () => new Float32Array(m));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      simMatrix[i][j] = fastSectionSimilarity(taggedA[i], taggedB[j]);
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
      // Apply positional distance penalty to prevent false distant anchor jumps in sequential alignment.
      // Truly relocated/moved sections are handled cleanly in Phase 2 without distorting sequential order.
      const dist = Math.abs((i - 1) - (j - 1));
      const distPenalty = dist > 2 ? Math.min(1.2, (dist - 2) * 0.08) : 0;
      const effectiveSim = sim - distPenalty;

      // Reward matching pairs; penalize incompatible or distant pairs
      const matchScore = (sim >= 0.35 && effectiveSim >= 0.25) 
        ? (effectiveSim * 2.0 - 0.2) 
        : -1.0;

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

  const initialDeletedA = unmatchedA.filter(a => !claimedA.has(a._idx));
  const initialAddedB = unmatchedB.filter(b => !claimedB.has(b._idx));

  // Validate in-sequence pairs: if two paired sections have < 20% word similarity,
  // split them into a deleted section and an added section (eliminating false 0% pairings)
  const inSequencePairsValid = [];
  const deletedA = [...initialDeletedA];
  const addedB = [...initialAddedB];

  for (const pair of inSequencePairs) {
    const contentA = filterText(pair.a.content, filterOpts);
    const contentB = filterText(pair.b.content, filterOpts);
    const isExact = filterOpts.ignoreWhitespace
      ? (contentA.trim() === contentB.trim() || (filterOpts.ignoreCase && contentA.trim().toLowerCase() === contentB.trim().toLowerCase()))
      : (contentA === contentB || (filterOpts.ignoreCase && contentA.toLowerCase() === contentB.toLowerCase()));

    if (isExact) {
      inSequencePairsValid.push(pair);
      continue;
    }

    const diffOpts = {};
    if (filterOpts.ignoreCase) diffOpts.ignoreCase = true;
    const diffsWithSpace = safeWordDiff(contentA, contentB, diffOpts);
    const stats = calculateWordSimilarity(contentA, contentB, diffsWithSpace, filterOpts);

    if (stats.similarityPercent >= 20 || (stats.addedWords === 0 && stats.deletedWords === 0)) {
      inSequencePairsValid.push(pair);
    } else {
      // Split false pairing into separate deletion and addition
      deletedA.push(pair.a);
      addedB.push(pair.b);
    }
  }

  deletedA.sort((x, y) => x._idx - y._idx);
  addedB.sort((x, y) => x._idx - y._idx);

  // Extract clear human-readable snippet explaining the exact changes
  function summarizeDiffTokens(diffTokens = []) {
    const removedParts = [];
    const addedParts = [];
    let removedWsChars = 0;
    let addedWsChars = 0;

    for (let i = 0; i < diffTokens.length; i++) {
      const t = diffTokens[i];
      if (t.type === 'removed') {
        if (t.value.trim()) {
          removedParts.push(t.value.trim());
        } else if (/\s/.test(t.value)) {
          removedWsChars += t.value.length;
        }
      } else if (t.type === 'added') {
        if (t.value.trim()) {
          addedParts.push(t.value.trim());
        } else if (/\s/.test(t.value)) {
          addedWsChars += t.value.length;
        }
      }
    }

    if (removedParts.length === 0 && addedParts.length === 0) {
      if (removedWsChars > 0 || addedWsChars > 0) {
        return `Spacing adjusted (${addedWsChars > 0 ? `+${addedWsChars}` : ''}${removedWsChars > 0 ? ` -${removedWsChars}` : ''} space chars)`;
      }
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
      const contentA = filterText(secA.content, filterOpts);
      const contentB = filterText(secB.content, filterOpts);
      const isExact = filterOpts.ignoreWhitespace
        ? (contentA.trim() === contentB.trim() || (filterOpts.ignoreCase && contentA.trim().toLowerCase() === contentB.trim().toLowerCase()))
        : (contentA === contentB || (filterOpts.ignoreCase && contentA.toLowerCase() === contentB.toLowerCase()));

      const diffOpts = {};
      if (filterOpts.ignoreCase) diffOpts.ignoreCase = true;

      const diffsWithSpace = safeWordDiff(contentA, contentB, diffOpts);
      const stats = calculateWordSimilarity(contentA, contentB, diffsWithSpace, filterOpts);

      let status = isMoved 
        ? 'MOVED' 
        : (isExact ? 'UNCHANGED' : 'MODIFIED');

      let title = isMoved
        ? `${secA.title} ➔ ${secB.title}`
        : (secA.title === secB.title ? secA.title : `${secA.title} ↔ ${secB.title}`);

      const smartPreview = summarizeDiffTokens(diffsWithSpace);

      let description = '';
      if (isMoved) {
        if (isExact) {
          description = `Moved from ${secA.title} to ${secB.title} (Identical content)`;
        } else {
          description = `Moved from ${secA.title} to ${secB.title}${smartPreview ? ` • ${smartPreview}` : ` (+${stats.addedWords}, -${stats.deletedWords} words)`}`;
        }
      } else if (status === 'UNCHANGED') {
        description = 'Identical content';
      } else {
        if (stats.addedWords === 0 && stats.deletedWords === 0 && stats.whitespaceChanges > 0) {
          description = smartPreview 
            ? smartPreview 
            : `Spacing / formatting adjusted (${stats.whitespaceChanges} whitespace ${stats.whitespaceChanges === 1 ? 'char' : 'chars'} altered)`;
        } else {
          description = smartPreview 
            ? `${smartPreview} (+${stats.addedWords}, -${stats.deletedWords} words)`
            : `${stats.addedWords} words added, ${stats.deletedWords} words removed`;
        }
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
        filteredContentA: contentA,
        filteredContentB: contentB,
        stats: {
          ...stats,
          similarityPercent
        },
        diffTokens: diffsWithSpace.map(p => ({
          value: p.value,
          type: p.added ? 'added' : p.removed ? 'removed' : 'unchanged',
          isWhitespace: /^\s+$/.test(p.value)
        }))
      };
    } else if (secA && !secB) {
      const filteredA = filterText(secA.content, filterOpts);
      const wordsCount = tokenizeWords(filteredA).length;
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
        filteredContentA: filteredA,
        filteredContentB: '',
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
      const filteredB = filterText(secB.content, filterOpts);
      const wordsCount = tokenizeWords(filteredB).length;
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
        filteredContentA: '',
        filteredContentB: filteredB,
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
    const inSeq = inSequencePairsValid.find(p => p.a._idx === a._idx);
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
function generateSummaryDescription(similarityPercent, stats, sectionReports, filterOpts = {}) {
  let category = 'IDENTICAL';
  let badgeColor = 'green';
  let headline = '';

  if (similarityPercent === 100) {
    category = 'IDENTICAL';
    badgeColor = 'emerald';
    headline = 'The two documents are 100% word-for-word identical.';
  } else if (stats.addedWords === 0 && stats.deletedWords === 0 && stats.whitespaceChanges > 0 && !filterOpts.ignoreWhitespace) {
    category = 'SPACING_DIFFS';
    badgeColor = 'blue';
    headline = `Identical wording with ${stats.whitespaceChanges} whitespace/indentation ${stats.whitespaceChanges === 1 ? 'difference' : 'differences'} detected.`;
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
  if (stats.whitespaceChanges > 0 && !filterOpts.ignoreWhitespace) {
    keyPoints.push(`${stats.whitespaceChanges} whitespace/spacing ${stats.whitespaceChanges === 1 ? 'difference' : 'differences'} detected`);
  }
  if (movedSections.length > 0) keyPoints.push(`${movedSections.length} ${movedSections.length === 1 ? 'section' : 'sections'} moved / relocated`);
  if (modifiedSections.length > 0) keyPoints.push(`${modifiedSections.length} sections modified`);
  if (addedSections.length > 0) keyPoints.push(`${addedSections.length} new sections added`);
  if (deletedSections.length > 0) keyPoints.push(`${deletedSections.length} sections removed`);

  // Highlight active noise filters in audit summary
  const activeFilters = [];
  if (filterOpts.ignoreCase) activeFilters.push('Case Insensitive');
  if (filterOpts.ignorePunctuation) activeFilters.push('Punctuation Filtered');
  if (filterOpts.ignoreWhitespace) {
    activeFilters.push('Whitespace Normalized');
  } else {
    activeFilters.push('Whitespace Sensitive (Strict)');
  }
  if (filterOpts.ignoreNumbers) activeFilters.push('Numbers Filtered');
  if (filterOpts.trimLines) activeFilters.push('Lines Trimmed');

  if (activeFilters.length > 0) {
    keyPoints.push(`Smart noise filters applied: ${activeFilters.join(', ')}`);
  }

  return {
    category,
    badgeColor,
    headline,
    keyPoints,
    statsDescription: `Document A (${stats.totalWordsA} words) vs Document B (${stats.totalWordsB} words): ${stats.unchangedWords} matching words.`
  };
}

/**
 * Helper to convert 0-indexed column number to Excel column letter (0->A, 1->B, 25->Z, 26->AA)
 */
function getExcelColumnLetter(idx) {
  let letter = '';
  let temp = idx;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Compare two sets of spreadsheet sheets cell-by-cell with numerical delta analysis
 */
export function compareSpreadsheetSheets(sheetsA = [], sheetsB = [], filterOpts = {}) {
  if ((!sheetsA || sheetsA.length === 0) && (!sheetsB || sheetsB.length === 0)) {
    return null;
  }

  const comparedSheets = [];

  // Match sheets by name or index
  const allSheetNames = new Set([
    ...sheetsA.map(s => s.name),
    ...sheetsB.map(s => s.name)
  ]);

  for (const sheetName of allSheetNames) {
    const sA = sheetsA.find(s => s.name === sheetName) || sheetsA[comparedSheets.length] || { matrix: [] };
    const sB = sheetsB.find(s => s.name === sheetName) || sheetsB[comparedSheets.length] || { matrix: [] };

    const matrixA = sA.matrix || [];
    const matrixB = sB.matrix || [];

    const maxRows = Math.max(matrixA.length, matrixB.length);
    let maxCols = 0;
    for (const r of matrixA) if (r && r.length > maxCols) maxCols = r.length;
    for (const r of matrixB) if (r && r.length > maxCols) maxCols = r.length;

    if (maxRows === 0 || maxCols === 0) continue;

    const colHeaders = [];
    for (let c = 0; c < maxCols; c++) {
      colHeaders.push(getExcelColumnLetter(c));
    }

    const rowDiffs = [];
    let modifiedCellsCount = 0;
    let addedCellsCount = 0;
    let deletedCellsCount = 0;
    let unchangedCellsCount = 0;
    let totalCellsCount = 0;
    let addedRowsCount = 0;
    let deletedRowsCount = 0;

    for (let r = 0; r < maxRows; r++) {
      const rowA = matrixA[r] || null;
      const rowB = matrixB[r] || null;

      const isRowAdded = !rowA && !!rowB;
      const isRowDeleted = !!rowA && !rowB;
      if (isRowAdded) addedRowsCount++;
      if (isRowDeleted) deletedRowsCount++;

      let hasRowDiff = isRowAdded || isRowDeleted;
      const cells = [];

      for (let c = 0; c < maxCols; c++) {
        totalCellsCount++;
        const rawA = rowA && rowA[c] !== undefined ? String(rowA[c]) : '';
        const rawB = rowB && rowB[c] !== undefined ? String(rowB[c]) : '';

        const cleanA = filterOpts.ignoreWhitespace ? rawA.trim() : rawA;
        const cleanB = filterOpts.ignoreWhitespace ? rawB.trim() : rawB;

        const isExact = filterOpts.ignoreCase
          ? cleanA.toLowerCase() === cleanB.toLowerCase()
          : cleanA === cleanB;

        let status = 'unchanged';
        let delta = null;
        let percentChange = null;
        let isNumeric = false;

        if (isExact) {
          status = 'unchanged';
          unchangedCellsCount++;
        } else if (cleanA && !cleanB) {
          status = 'deleted';
          deletedCellsCount++;
          hasRowDiff = true;
        } else if (!cleanA && cleanB) {
          status = 'added';
          addedCellsCount++;
          hasRowDiff = true;
        } else {
          status = 'modified';
          modifiedCellsCount++;
          hasRowDiff = true;

          // Numerical delta calculation
          const numA = parseFloat(cleanA.replace(/[^0-9.-]/g, ''));
          const numB = parseFloat(cleanB.replace(/[^0-9.-]/g, ''));

          if (!isNaN(numA) && !isNaN(numB)) {
            isNumeric = true;
            delta = Math.round((numB - numA) * 100) / 100;
            if (numA !== 0) {
              percentChange = Math.round(((delta / Math.abs(numA)) * 100) * 10) / 10;
            }
          }
        }

        cells.push({
          colIndex: c,
          colLetter: colHeaders[c],
          valA: rawA,
          valB: rawB,
          status,
          isNumeric,
          delta,
          percentChange
        });
      }

      rowDiffs.push({
        rowNum: r + 1,
        isRowAdded,
        isRowDeleted,
        hasRowDiff,
        status: isRowAdded ? 'added' : isRowDeleted ? 'deleted' : hasRowDiff ? 'modified' : 'unchanged',
        cells
      });
    }

    comparedSheets.push({
      sheetName: sheetName || sA.name || sB.name || `Sheet ${comparedSheets.length + 1}`,
      colHeaders,
      maxRows,
      maxCols,
      rows: rowDiffs,
      stats: {
        totalCells: totalCellsCount,
        modifiedCells: modifiedCellsCount,
        addedCells: addedCellsCount,
        deletedCells: deletedCellsCount,
        unchangedCells: unchangedCellsCount,
        addedRows: addedRowsCount,
        deletedRows: deletedRowsCount,
        totalDiffCells: modifiedCellsCount + addedCellsCount + deletedCellsCount
      }
    });
  }

  return comparedSheets.length > 0 ? comparedSheets : null;
}

/**
 * Compare two extracted document objects
 * @param {Object} docA - Extracted content of Document A { text, sections, format, filename }
 * @param {Object} docB - Extracted content of Document B { text, sections, format, filename }
 * @param {Object} options - Smart Noise Filtering options { ignoreCase, ignorePunctuation, ignoreWhitespace, ignoreNumbers, trimLines }
 */
export function compareDocuments(docA, docB, options = {}) {
  const filterOpts = {
    ignoreCase: options.ignoreCase === true || options.ignoreCase === 'true',
    ignorePunctuation: options.ignorePunctuation === true || options.ignorePunctuation === 'true',
    ignoreWhitespace: options.ignoreWhitespace === true || options.ignoreWhitespace === 'true',
    ignoreNumbers: options.ignoreNumbers === true || options.ignoreNumbers === 'true',
    trimLines: options.trimLines === true || options.trimLines === 'true'
  };

  const rawTextA = docA.text || '';
  const rawTextB = docB.text || '';

  const textA = filterText(rawTextA, filterOpts);
  const textB = filterText(rawTextB, filterOpts);

  const diffOpts = {};
  if (filterOpts.ignoreCase) {
    diffOpts.ignoreCase = true;
  }

  // 1. Detailed Word-level Diffs with options (using high-performance hybrid diff)
  const wordDiffs = hybridDiffWords(textA, textB, diffOpts);

  // Format diff tokens for easy frontend rendering
  const formattedDiffs = wordDiffs.map(part => ({
    value: part.value,
    type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
    isWhitespace: /^\s+$/.test(part.value)
  }));

  // 2. Compute similarity stats & percentages
  const stats = calculateWordSimilarity(textA, textB, wordDiffs, filterOpts);

  // 3. Section by section comparison with filters
  const sectionReports = compareSections(docA.sections, docB.sections, filterOpts);

  // 4. Generate local structured summary
  const summary = generateSummaryDescription(stats.similarityPercent, stats, sectionReports, filterOpts);

  // 5. If spreadsheet data (XLSX, XLS, CSV) exists, compute structured cell-by-cell matrix diff
  const spreadsheetDiff = compareSpreadsheetSheets(docA.sheets || [], docB.sheets || [], filterOpts);

  const isStrictExact = filterOpts.ignoreWhitespace
    ? (stats.similarityPercent === 100)
    : (textA === textB || (filterOpts.ignoreCase ? textA.toLowerCase() === textB.toLowerCase() : false));

  return {
    isIdentical: isStrictExact && stats.similarityPercent === 100,
    similarityPercent: isStrictExact ? 100 : stats.similarityPercent,
    stats,
    summary,
    sectionReports,
    spreadsheetDiff,
    diffTokens: formattedDiffs,
    filters: filterOpts,
    meta: {
      docA: { filename: docA.filename, format: docA.format, wordCount: docA.wordCount },
      docB: { filename: docB.filename, format: docB.format, wordCount: docB.wordCount }
    }
  };
}
