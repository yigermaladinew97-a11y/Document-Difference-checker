/**
 * Smart File Pairing Engine
 * Automatically detects and pairs corresponding document versions (e.g. v1 vs v2, draft vs final)
 * based on filename conventions, patterns, and string similarity.
 */

// Suffix/prefix tokens that typically indicate versioning or revision states
const VERSION_PATTERNS = [
  /[-_\s]v(?:er(?:sion)?)?[-_\s]?(\d+(?:\.\d+)*)/i,         // _v1, -v2.1, version 3
  /[-_\s]rev(?:ision)?[-_\s]?(\d+(?:\.\d+)*)/i,              // _rev1, -rev2
  /[-_\s]draft[-_\s]?(\d+)?/i,                               // _draft, -draft2
  /[-_\s]final[-_\s]?(\d+)?/i,                               // _final
  /[-_\s]old/i,                                              // _old
  /[-_\s]new/i,                                              // _new
  /[-_\s]original/i,                                         // _original
  /[-_\s]revised/i,                                          // _revised
  /[-_\s]updated/i,                                          // _updated
  /[-_\s]copy/i,                                             // _copy
  /[-_\s]\((\d+)\)/,                                         // (1), (2)
  /[-_\s]q([1-4])[-_\s]?(\d{2,4})?/i,                        // _q1_2024, -Q2
  /[-_\s](19\d{2}|20\d{2})/                                  // 2023, 2024
];

/**
 * Strips file extension and returns lowercase base
 */
export function getFileBaseAndExt(filename = '') {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return { base: filename, ext: '' };
  return {
    base: filename.substring(0, lastDot),
    ext: filename.substring(lastDot).toLowerCase()
  };
}

/**
 * Normalizes filename by removing version suffixes/indicators
 */
export function normalizeBaseName(filename = '') {
  let { base } = getFileBaseAndExt(filename);
  let cleaned = base;

  // Sequentially strip recognized versioning patterns
  VERSION_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Clean trailing delimiters and extra spaces
  cleaned = cleaned
    .replace(/[-_\s]+$/g, '')
    .replace(/^[-_\s]+/g, '')
    .replace(/[-_\s]+/g, ' ')
    .trim()
    .toLowerCase();

  return cleaned || base.toLowerCase().trim();
}

/**
 * Determines which file in a pair should be Document A (Original) vs Document B (Revised)
 * Returns { docA, docB, reason }
 */
export function orientPair(file1, file2) {
  const name1 = file1.name.toLowerCase();
  const name2 = file2.name.toLowerCase();

  // Pattern checks for 'old', 'original', 'v1', 'draft' vs 'new', 'revised', 'v2', 'final'
  const isOriginal1 = /v0?1\b|old|original|draft|before|prev|source/i.test(name1);
  const isOriginal2 = /v0?1\b|old|original|draft|before|prev|source/i.test(name2);
  const isRevised1 = /v0?[2-9]\b|new|revised|final|after|next|target|updated/i.test(name1);
  const isRevised2 = /v0?[2-9]\b|new|revised|final|after|next|target|updated/i.test(name2);

  if (isOriginal1 || isRevised2) {
    return { docA: file1, docB: file2, reason: 'Detected version numbering / stage (A: v1/original, B: v2/revised)' };
  }
  if (isOriginal2 || isRevised1) {
    return { docA: file2, docB: file1, reason: 'Detected version numbering / stage (A: v1/original, B: v2/revised)' };
  }

  // Fallback: compare modification timestamps if available
  if (file1.lastModified && file2.lastModified) {
    if (file1.lastModified < file2.lastModified) {
      return { docA: file1, docB: file2, reason: 'Ordered by file modification date (A: older, B: newer)' };
    } else if (file2.lastModified < file1.lastModified) {
      return { docA: file2, docB: file1, reason: 'Ordered by file modification date (A: older, B: newer)' };
    }
  }

  // Fallback: alphabetical
  return { docA: file1, docB: file2, reason: 'Matched by common document root' };
}

/**
 * Computes Dice token similarity between two strings
 */
function tokenSimilarity(str1, str2) {
  const tokens1 = new Set(str1.toLowerCase().split(/[-_\s.]+/).filter(Boolean));
  const tokens2 = new Set(str2.toLowerCase().split(/[-_\s.]+/).filter(Boolean));
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  tokens1.forEach(t => {
    if (tokens2.has(t)) intersection++;
  });

  return (2 * intersection) / (tokens1.size + tokens2.size);
}

/**
 * Auto-pairs an array of File objects
 * Returns { pairs: [...], unpaired: [...] }
 */
export function autoPairFiles(files = []) {
  if (!files || files.length === 0) {
    return { pairs: [], unpaired: [] };
  }

  const validFiles = Array.from(files).filter(f => f && f.name && !f.name.startsWith('.'));
  const usedIndices = new Set();
  const pairs = [];

  // Group files by normalized root name and extension
  const metaList = validFiles.map((file, index) => {
    const { ext } = getFileBaseAndExt(file.name);
    const normalized = normalizeBaseName(file.name);
    return { file, index, ext, normalized };
  });

  // Pass 1: Exact normalized base name match with compatible extensions
  for (let i = 0; i < metaList.length; i++) {
    if (usedIndices.has(i)) continue;
    let bestMatchIdx = -1;
    let bestScore = 0;

    for (let j = i + 1; j < metaList.length; j++) {
      if (usedIndices.has(j)) continue;

      // Check if normalized names are identical
      if (metaList[i].normalized === metaList[j].normalized && metaList[i].normalized.length > 2) {
        // Prefer exact matching file extensions (e.g. .pdf to .pdf)
        const extMatch = metaList[i].ext === metaList[j].ext ? 1.0 : 0.8;
        if (extMatch > bestScore) {
          bestScore = extMatch;
          bestMatchIdx = j;
        }
      }
    }

    if (bestMatchIdx !== -1) {
      usedIndices.add(i);
      usedIndices.add(bestMatchIdx);
      const oriented = orientPair(metaList[i].file, metaList[bestMatchIdx].file);
      pairs.push({
        id: `pair_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        docA: oriented.docA,
        docB: oriented.docB,
        matchReason: oriented.reason,
        confidence: 'high'
      });
    }
  }

  // Pass 2: Fuzzy token similarity matching for remaining files
  for (let i = 0; i < metaList.length; i++) {
    if (usedIndices.has(i)) continue;
    let bestMatchIdx = -1;
    let bestScore = 0;

    for (let j = i + 1; j < metaList.length; j++) {
      if (usedIndices.has(j)) continue;

      const sim = tokenSimilarity(metaList[i].file.name, metaList[j].file.name);
      // High token similarity threshold (>= 0.6)
      if (sim >= 0.6 && sim > bestScore) {
        bestScore = sim;
        bestMatchIdx = j;
      }
    }

    if (bestMatchIdx !== -1 && bestScore >= 0.6) {
      usedIndices.add(i);
      usedIndices.add(bestMatchIdx);
      const oriented = orientPair(metaList[i].file, metaList[bestMatchIdx].file);
      pairs.push({
        id: `pair_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        docA: oriented.docA,
        docB: oriented.docB,
        matchReason: `Fuzzy title match (${Math.round(bestScore * 100)}% token alignment)`,
        confidence: 'medium'
      });
    }
  }

  // Collect any remaining files as unpaired
  const unpaired = metaList
    .filter(item => !usedIndices.has(item.index))
    .map(item => item.file);

  return { pairs, unpaired };
}
