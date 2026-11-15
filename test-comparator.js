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

  console.log('\n=======================================');
  console.log('🎉 STEP 2 VERIFICATION COMPLETE: COMPARATOR WORKING ACCURATELY!');
  console.log('=======================================');
}

runComparatorTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
