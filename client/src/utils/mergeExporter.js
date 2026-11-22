/**
 * Builds array of Docx Paragraph elements preserving redline strike/underline tokens across line breaks
 */
function buildRedlineParagraphs(diffTokens = [], { Paragraph, TextRun }) {
  const paragraphs = [];
  let currentRuns = [];

  for (const token of diffTokens) {
    const rawVal = token.value || '';
    const segments = rawVal.split(/\r?\n/);

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];

      if (seg.length > 0) {
        if (token.type === 'removed') {
          // Deleted text: Red strikethrough with soft pink background
          currentRuns.push(
            new TextRun({
              text: seg,
              strike: true,
              color: 'C00000',
              shading: { fill: 'FCE8E6' },
              size: 24, // 12pt
              font: 'Calibri'
            })
          );
        } else if (token.type === 'added') {
          // Added text: Green underline with bold and soft green background
          currentRuns.push(
            new TextRun({
              text: seg,
              underline: { type: 'single', color: '0D8050' },
              color: '0D8050',
              bold: true,
              shading: { fill: 'E6F4EA' },
              size: 24, // 12pt
              font: 'Calibri'
            })
          );
        } else {
          // Unchanged text
          currentRuns.push(
            new TextRun({
              text: seg,
              size: 24,
              font: 'Calibri'
            })
          );
        }
      }

      // If newline was encountered, seal the current paragraph and start the next
      if (i < segments.length - 1) {
        paragraphs.push(
          new Paragraph({
            children: currentRuns.length > 0 ? currentRuns : [new TextRun({ text: '' })],
            spacing: { after: 180, line: 360 }
          })
        );
        currentRuns = [];
      }
    }
  }

  if (currentRuns.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: currentRuns,
        spacing: { after: 180, line: 360 }
      })
    );
  }

  return paragraphs;
}

/**
 * Export full legal redline comparison to Microsoft Word (.docx)
 * with strikethrough deletions, underlined additions, and professional audit cover metadata.
 * Dynamically imports 'docx' on-demand to keep the initial page bundle light and fast.
 */
export async function exportRedlineDocx(diffTokens = [], meta = {}, stats = {}) {
  const { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType } = await import('docx');

  const docAName = meta?.docA?.filename || 'Document A';
  const docBName = meta?.docB?.filename || 'Document B';
  const similarity = stats?.similarityPercent ?? 100;
  const addedWords = stats?.addedWords ?? 0;
  const deletedWords = stats?.deletedWords ?? 0;
  const nowStr = new Date().toLocaleString();

  const contentParagraphs = buildRedlineParagraphs(diffTokens, { Paragraph, TextRun });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: [
          new Paragraph({
            text: 'LEGAL REDLINE COMPARISON AUDIT',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.LEFT,
            spacing: { after: 160 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Baseline (Doc A): ', bold: true, color: '334155', size: 21 }),
              new TextRun({ text: `${docAName}\n`, color: '0F172A', size: 21 }),
              new TextRun({ text: 'Revised (Doc B): ', bold: true, color: '334155', size: 21 }),
              new TextRun({ text: `${docBName}\n`, color: '0F172A', size: 21 }),
              new TextRun({ text: 'Generated: ', bold: true, color: '334155', size: 21 }),
              new TextRun({ text: `${nowStr}\n`, color: '64748B', size: 21 }),
              new TextRun({ text: 'Similarity: ', bold: true, color: '334155', size: 21 }),
              new TextRun({ text: `${similarity}% match  |  +${addedWords} words added  |  -${deletedWords} words removed`, color: 'D97706', bold: true, size: 21 })
            ],
            spacing: { after: 240 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'MARKUP KEY:  ', bold: true, size: 20, color: '1E293B' }),
              new TextRun({ text: '[ Strikethrough Red ]', strike: true, color: 'C00000', bold: true, shading: { fill: 'FCE8E6' }, size: 20 }),
              new TextRun({ text: ' = Deleted from Doc A   |   ', size: 20, color: '475569' }),
              new TextRun({ text: '[ Underline Green ]', underline: { type: 'single', color: '0D8050' }, color: '0D8050', bold: true, shading: { fill: 'E6F4EA' }, size: 20 }),
              new TextRun({ text: ' = Added in Doc B', size: 20, color: '475569' })
            ],
            shading: { fill: 'F1F5F9' },
            spacing: { before: 100, after: 360, line: 300 }
          }),
          new Paragraph({
            text: '─────────────────────────────────────────────────────────────',
            color: 'CBD5E1',
            spacing: { after: 280 }
          }),
          ...contentParagraphs
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const baseName = (meta?.docB?.filename || meta?.docA?.filename || 'Document').replace(/\.[^/.]+$/, '');
  a.href = url;
  a.download = `Redline_${baseName}_${Date.now()}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Groups raw diff tokens into discrete, reviewable change blocks
 * Consecutive additions and deletions become a single replacement unit
 */
export function extractChangeBlocks(diffTokens = []) {
  if (!diffTokens || diffTokens.length === 0) return [];

  const blocks = [];
  let changeIndex = 0;
  let i = 0;

  while (i < diffTokens.length) {
    const token = diffTokens[i];

    if (token.type === 'unchanged') {
      blocks.push({
        isChange: false,
        text: token.value
      });
      i++;
    } else {
      // Gather all contiguous added/removed tokens into one change unit
      const removedParts = [];
      const addedParts = [];

      while (i < diffTokens.length && diffTokens[i].type !== 'unchanged') {
        const cur = diffTokens[i];
        if (cur.type === 'removed') {
          removedParts.push(cur.value);
        } else if (cur.type === 'added') {
          addedParts.push(cur.value);
        }
        i++;
      }

      changeIndex++;
      const origText = removedParts.join('');
      const newText = addedParts.join('');

      let changeType = 'replacement';
      if (!origText && newText) changeType = 'addition';
      else if (origText && !newText) changeType = 'deletion';

      blocks.push({
        isChange: true,
        id: `change-${changeIndex}`,
        changeNum: changeIndex,
        changeType,
        originalText: origText,
        newText: newText
      });
    }
  }

  return blocks;
}

/**
 * Annotates raw diffTokens with changeId, changeNum, changeType, and grouping metadata.
 * This links every added/removed token in Side-by-Side and Unified views to a discrete change block.
 */
export function tagTokensWithChangeIds(diffTokens = []) {
  if (!diffTokens || diffTokens.length === 0) return [];

  const tagged = [];
  let changeIndex = 0;
  let i = 0;

  while (i < diffTokens.length) {
    const token = diffTokens[i];

    if (token.type === 'unchanged') {
      tagged.push({
        ...token,
        globalIndex: tagged.length,
        isChange: false,
        changeId: null,
        changeNum: null
      });
      i++;
    } else {
      changeIndex++;
      const changeId = `change-${changeIndex}`;
      const groupTokens = [];
      const removedParts = [];
      const addedParts = [];

      while (i < diffTokens.length && diffTokens[i].type !== 'unchanged') {
        const cur = diffTokens[i];
        groupTokens.push(cur);
        if (cur.type === 'removed') removedParts.push(cur.value);
        else if (cur.type === 'added') addedParts.push(cur.value);
        i++;
      }

      const origText = removedParts.join('');
      const newText = addedParts.join('');

      let changeType = 'replacement';
      if (!origText && newText) changeType = 'addition';
      else if (origText && !newText) changeType = 'deletion';

      const changeMeta = {
        isChange: true,
        changeId,
        changeNum: changeIndex,
        changeType,
        originalText: origText,
        newText: newText
      };

      for (let g = 0; g < groupTokens.length; g++) {
        tagged.push({
          ...groupTokens[g],
          ...changeMeta,
          globalIndex: tagged.length,
          isFirstInChange: g === 0
        });
      }
    }
  }

  return tagged;
}

/**
 * Computes the final resolved document string based on user accept/reject decisions
 * - accepted: takes newText (Doc B)
 * - rejected: takes originalText (Doc A)
 * - pending: defaults to newText (Doc B)
 */
export function computeMergedDocumentText(blocks = [], decisions = {}) {
  let result = '';

  for (const block of blocks) {
    if (!block.isChange) {
      result += block.text;
    } else {
      const decision = decisions[block.id] || 'pending';
      if (decision === 'accepted') {
        result += block.newText;
      } else if (decision === 'rejected') {
        result += block.originalText;
      } else {
        // Pending: default to revision (Doc B) or original if addition was empty
        result += (block.newText !== '' ? block.newText : block.originalText);
      }
    }
  }

  return result;
}

/**
 * Export resolved document to Microsoft Word (.docx)
 */
export async function exportMergedDocx(blocks = [], decisions = {}, meta = {}) {
  const mergedText = computeMergedDocumentText(blocks, decisions);
  const paragraphs = mergedText.split(/\n+/).filter(p => p.trim());
  const filename = `Resolved_${meta?.docB?.filename?.replace(/\.[^/.]+$/, '') || 'Document'}_${Date.now()}.docx`;

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: `Resolved Document Review (${new Date().toLocaleDateString()})`,
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.LEFT,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Merged from ${meta?.docA?.filename || 'Document A'} and ${meta?.docB?.filename || 'Document B'}`,
                italics: true,
                color: '666666',
                size: 20
              })
            ],
            spacing: { after: 400 }
          }),
          ...paragraphs.map(p => new Paragraph({
            children: [
              new TextRun({
                text: p,
                size: 24, // 12pt
                font: 'Calibri'
              })
            ],
            spacing: { after: 220, line: 360 }
          }))
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export resolved document to clean plain text (.txt)
 */
export function exportMergedTxt(blocks = [], decisions = {}, meta = {}) {
  const mergedText = computeMergedDocumentText(blocks, decisions);
  const filename = `Resolved_${meta?.docB?.filename?.replace(/\.[^/.]+$/, '') || 'Document'}_${Date.now()}.txt`;
  const blob = new Blob([mergedText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
