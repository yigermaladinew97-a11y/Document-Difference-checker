import { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType } from 'docx';

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
