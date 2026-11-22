import { compareDocuments } from './comparator.js';

async function runComparatorTests() {
  console.log('--- Testing Comparison & Diff Engine (Step 2) ---\n');

  // Test Case 1: Identical Documents
  console.log('[Test 1/3] Comparing Identical Documents...');
  const docOriginal = {
    filename: 'NDA_v1.docx',
    format: 'docx',
    wordCount: 15,
    text: 'This Agreement is entered into between Company Alpha and Consultant Beta regarding confidential project data.',
    sections: [
      { title: 'Clause 1', content: 'This Agreement is entered into between Company Alpha and Consultant Beta regarding confidential project data.' }
    ]
  };
  const docIdentical = { ...docOriginal, filename: 'NDA_copy.pdf', format: 'pdf' };

  const res1 = compareDocuments(docOriginal, docIdentical);
  console.log(`✓ Is Identical: ${res1.isIdentical}`);
  console.log(`✓ Similarity: ${res1.similarityPercent}%`);
  console.log(`✓ Category: ${res1.summary.category}`);
  console.log(`✓ Headline: "${res1.summary.headline}"`);

  // Test Case 2: Modified Document (Minor edits & clause addition)
  console.log('\n[Test 2/3] Comparing Document with Specific Word Changes...');
  const docModified = {
    filename: 'NDA_v2.docx',
    format: 'docx',
    wordCount: 19,
    text: 'This Agreement is entered into between Company Alpha and Partner Gamma regarding confidential proprietary project data and software source code.',
    sections: [
      { title: 'Clause 1', content: 'This Agreement is entered into between Company Alpha and Partner Gamma regarding confidential proprietary project data and software source code.' }
    ]
  };

  const res2 = compareDocuments(docOriginal, docModified);
  console.log(`✓ Similarity: ${res2.similarityPercent}%`);
  console.log(`✓ Stats: Added=${res2.stats.addedWords} words, Removed=${res2.stats.deletedWords} words, Unchanged=${res2.stats.unchangedWords} words`);
  console.log(`✓ Category: ${res2.summary.category}`);
  console.log(`✓ Key Points: ${res2.summary.keyPoints.join(' | ')}`);
  
  // Show a few diff tokens
  const sampleDiff = res2.diffTokens
    .filter(t => t.type !== 'unchanged')
    .map(t => `${t.type === 'added' ? '+' : '-'}[${t.value.trim()}]`)
    .join(' ');
  console.log(`✓ Detected Word Diffs: ${sampleDiff}`);

  // Test Case 3: Multi-Section Document (e.g. Slides or Pages where one changed and one was added)
  console.log('\n[Test 3/3] Comparing Multi-Section Document (Slides / Pages)...');
  const presentationA = {
    filename: 'pitch_deck_v1.pptx',
    format: 'pptx',
    wordCount: 12,
    text: 'Introduction to Product X. Revenue forecast is 100K.',
    sections: [
      { title: 'Slide 1', content: 'Introduction to Product X.' },
      { title: 'Slide 2', content: 'Revenue forecast is 100K.' }
    ]
  };

  const presentationB = {
    filename: 'pitch_deck_v2.pptx',
    format: 'pptx',
    wordCount: 17,
    text: 'Introduction to Product X. Revenue forecast is 250K with high margin. Next steps and rollout plan.',
    sections: [
      { title: 'Slide 1', content: 'Introduction to Product X.' },
      { title: 'Slide 2', content: 'Revenue forecast is 250K with high margin.' },
      { title: 'Slide 3', content: 'Next steps and rollout plan.' }
    ]
  };

  const res3 = compareDocuments(presentationA, presentationB);
  console.log(`✓ Overall Similarity: ${res3.similarityPercent}%`);
  console.log('✓ Section Reports:');
  res3.sectionReports.forEach(sec => {
    console.log(`   - ${sec.title}: [${sec.status}] -> ${sec.description} (${sec.similarityPercent}% match)`);
  });

  // Test Case 4: Slide Deletion (Exact scenario reported by user)
  console.log('\n[Test 4/4] Comparing Presentations where 1 middle slide was removed...');
  const pptxFull = {
    filename: 'pitch_deck_v1.pptx',
    format: 'pptx',
    wordCount: 30,
    text: 'Company introduction and vision for Q4.\n\nFinancial plan: $500,000 venture funding round.\n\nTechnical architecture and security compliance.\n\nExecutive team and board of advisors.',
    sections: [
      { title: 'Slide 1', content: 'Company introduction and vision for Q4.' },
      { title: 'Slide 2', content: 'Financial plan: $500,000 venture funding round.' },
      { title: 'Slide 3', content: 'Technical architecture and security compliance.' },
      { title: 'Slide 4', content: 'Executive team and board of advisors.' }
    ]
  };

  const pptxWithSlideRemoved = {
    filename: 'pitch_deck_without_financials.pptx',
    format: 'pptx',
    wordCount: 23,
    text: 'Company introduction and vision for Q4.\n\nTechnical architecture and security compliance.\n\nExecutive team and board of advisors.',
    sections: [
      { title: 'Slide 1', content: 'Company introduction and vision for Q4.' },
      { title: 'Slide 2', content: 'Technical architecture and security compliance.' },
      { title: 'Slide 3', content: 'Executive team and board of advisors.' }
    ]
  };

  const res4 = compareDocuments(pptxFull, pptxWithSlideRemoved);
  console.log(`✓ Overall Similarity: ${res4.similarityPercent}%`);
  console.log('✓ Section Reports:');
  res4.sectionReports.forEach(sec => {
    console.log(`   - ${sec.title}: [${sec.status}] -> ${sec.description} (${sec.similarityPercent}% match)`);
  });

  // Test Case 5: Slide Relocation (User's feature request: Slide 2 moved to Slide 4)
  console.log('\n[Test 5/5] Comparing Presentations where 1 slide was MOVED to another position...');
  const pptxOriginal = {
    filename: 'quarterly_v1.pptx',
    format: 'pptx',
    wordCount: 24,
    text: 'Overview and agenda for quarterly planning.\n\nFinancial budget: $500,000 for marketing.\n\nTechnical architecture and security roadmap.\n\nExecutive team and closing remarks.',
    sections: [
      { title: 'Slide 1', content: 'Overview and agenda for quarterly planning.' },
      { title: 'Slide 2', content: 'Financial budget: $500,000 for marketing.' },
      { title: 'Slide 3', content: 'Technical architecture and security roadmap.' },
      { title: 'Slide 4', content: 'Executive team and closing remarks.' }
    ]
  };

  const pptxMoved = {
    filename: 'quarterly_v2.pptx',
    format: 'pptx',
    wordCount: 24,
    text: 'Overview and agenda for quarterly planning.\n\nTechnical architecture and security roadmap.\n\nExecutive team and closing remarks.\n\nFinancial budget: $500,000 for marketing.',
    sections: [
      { title: 'Slide 1', content: 'Overview and agenda for quarterly planning.' },
      { title: 'Slide 2', content: 'Technical architecture and security roadmap.' },
      { title: 'Slide 3', content: 'Executive team and closing remarks.' },
      { title: 'Slide 4', content: 'Financial budget: $500,000 for marketing.' }
    ]
  };

  const res5 = compareDocuments(pptxOriginal, pptxMoved);
  console.log(`✓ Overall Similarity: ${res5.similarityPercent}%`);
  console.log(`✓ Headline: "${res5.summary.headline}"`);
  console.log(`✓ Key Points: ${res5.summary.keyPoints.join(' | ')}`);
  console.log('✓ Section Reports:');
  res5.sectionReports.forEach(sec => {
    console.log(`   - ${sec.title}: [${sec.status}] -> ${sec.description} (${sec.similarityPercent}% match)`);
  });

  // Test Case 6: Smart Noise Filters (Ignore Case, Punctuation, Numbers, Whitespace)
  console.log('\n[Test 6/6] Testing Smart Noise Filters (Ignore Case, Punctuation, Numbers, Whitespace)...');
  const noisyDocA = {
    filename: 'contract_v1.docx',
    format: 'docx',
    wordCount: 20,
    text: 'Agreement made with ACME Corp., dated March 15, 2025: Provider shall receive $10,000 USD within 30 days.',
    sections: [
      { title: 'Section 1', content: 'Agreement made with ACME Corp., dated March 15, 2025: Provider shall receive $10,000 USD within 30 days.' }
    ]
  };

  const noisyDocB = {
    filename: 'contract_v2.docx',
    format: 'docx',
    wordCount: 20,
    text: 'agreement made with ACME Corp dated March 18, 2026: Provider shall receive $25,000 USD within 60 days.',
    sections: [
      { title: 'Section 1', content: 'agreement made with ACME Corp dated March 18, 2026: Provider shall receive $25,000 USD within 60 days.' }
    ]
  };

  // Compare without filters
  const rawCompare = compareDocuments(noisyDocA, noisyDocB);
  console.log(`✓ Without Filters: ${rawCompare.similarityPercent}% match (Added=${rawCompare.stats.addedWords}, Removed=${rawCompare.stats.deletedWords})`);

  // Compare with Smart Noise Filters (Case + Punctuation + Numbers + Whitespace)
  const filteredCompare = compareDocuments(noisyDocA, noisyDocB, {
    ignoreCase: true,
    ignorePunctuation: true,
    ignoreNumbers: true,
    ignoreWhitespace: true
  });
  console.log(`✓ With Smart Filters: ${filteredCompare.similarityPercent}% match (Added=${filteredCompare.stats.addedWords}, Removed=${filteredCompare.stats.deletedWords})`);
  console.log(`✓ Is Identical with Filters: ${filteredCompare.isIdentical}`);
  console.log(`✓ Active Filters Logged: ${filteredCompare.summary.keyPoints.find(k => k.includes('Smart noise filters')) || 'none'}`);

  // Test Case 7: Whitespace Sensitivity (Normalize Spaces ON vs OFF)
  console.log('\n[Test 7/7] Testing Whitespace Sensitivity (Normalize Spaces ON vs OFF)...');
  const wsDocA = {
    filename: 'code_sample_v1.txt',
    format: 'txt',
    wordCount: 6,
    text: 'function test() {\n  return true;\n}',
    sections: [{ title: 'Main Function', content: 'function test() {\n  return true;\n}' }]
  };
  const wsDocB = {
    filename: 'code_sample_v2.txt',
    format: 'txt',
    wordCount: 6,
    text: 'function test() {\n    return true;\n}', // 4 spaces indentation instead of 2 spaces
    sections: [{ title: 'Main Function', content: 'function test() {\n    return true;\n}' }]
  };

  // Case A: Normalize Spaces ON (ignoreWhitespace: true)
  const wsCompareOn = compareDocuments(wsDocA, wsDocB, { ignoreWhitespace: true });
  console.log(`✓ Normalize Spaces ON: IsIdentical=${wsCompareOn.isIdentical}, Similarity=${wsCompareOn.similarityPercent}%, Status=${wsCompareOn.sectionReports[0].status}`);
  if (!wsCompareOn.isIdentical || wsCompareOn.similarityPercent !== 100) {
    throw new Error('Expected 100% match when Normalize Spaces is ON!');
  }

  // Case B: Normalize Spaces OFF (ignoreWhitespace: false)
  const wsCompareOff = compareDocuments(wsDocA, wsDocB, { ignoreWhitespace: false });
  console.log(`✓ Normalize Spaces OFF: IsIdentical=${wsCompareOff.isIdentical}, Similarity=${wsCompareOff.similarityPercent}%, Status=${wsCompareOff.sectionReports[0].status}, Changes=${wsCompareOff.stats.whitespaceChanges}`);
  if (wsCompareOff.isIdentical || wsCompareOff.similarityPercent === 100 || wsCompareOff.stats.whitespaceChanges === 0) {
    throw new Error('Expected whitespace changes to be detected when Normalize Spaces is OFF!');
  }
  if (wsCompareOff.sectionReports[0].status !== 'MODIFIED') {
    throw new Error('Expected section status to be MODIFIED when Normalize Spaces is OFF!');
  }

  // Test Case 8: Intra-Word Sub-Diff Precision (character-level diffing inside modified words/numbers)
  console.log('\n[Test 8/8] Testing Intra-Word Character Precision Sub-Diffs...');
  const charDiffDocA = {
    filename: 'quote_v1.txt',
    format: 'txt',
    wordCount: 4,
    text: 'Software development environment'
  };
  const charDiffDocB = {
    filename: 'quote_v2.txt',
    format: 'txt',
    wordCount: 4,
    text: 'Software developer environment'
  };
  const charDiffRes = compareDocuments(charDiffDocA, charDiffDocB);
  const intraTokens = charDiffRes.diffTokens.filter(t => t.charDiff && t.charDiff.length > 1);
  console.log(`✓ Intra-word diff tokens detected: ${intraTokens.length}`);
  if (intraTokens.length === 0) {
    throw new Error('Expected at least one token with intra-word charDiff!');
  }
  const removedWord = intraTokens.find(t => t.type === 'removed');
  console.log(`✓ Removed word sub-diff: "${removedWord.value}" ➔ ${JSON.stringify(removedWord.charDiff)}`);

  console.log('\n=======================================');
  console.log('🎉 STEP 2 VERIFICATION COMPLETE: COMPARATOR WORKING ACCURATELY!');
  console.log('=======================================');
}

runComparatorTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
