const fs = require('fs');

// Read and parse
const content = fs.readFileSync('.github/instructions/paranoid-files-log.txt', 'utf8');
const lines = content.split(/\r?\n/);

// Extract file paths with subdirectory structure
const files = [];
for (const line of lines) {
  if (line.includes('] Chapter-1')) {
    const match = line.match(/\] (.+)$/);
    if (match) {
      files.push(match[1].trim());
    }
  }
}

// Extract subdirectory and filename from path
// Path format: Chapter-1\Desktop\RELEASER PARANOiD GWCW DESKTOP\Spread 01\Spread01.1.png
// We want: { subdir: 'Spread 01', filename: 'Spread01.1.png' }
function extractPathInfo(path) {
  const parts = path.split(/[\\\/]/);
  const filename = parts.pop(); // Last part is the filename
  
  // Find the subdirectory (should be the part after "RELEASER PARANOiD GWCW DESKTOP" or similar)
  // Look for the "Spread XX" pattern
  let subdir = '';
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].match(/^Spread\s*\d+/i)) {
      subdir = parts[i];
      break;
    }
  }
  
  return { subdir, filename };
}

// Get desktop and mobile files with subdirectory info
const desktopFiles = files
  .filter(f => f.includes('Desktop'))
  .map(f => extractPathInfo(f));
const mobileFiles = files
  .filter(f => f.includes('Mobile'))
  .map(f => extractPathInfo(f));

// Natural sort function with proper multi-level number handling
function naturalSort(a, b) {
  const stripExt = s => s.replace(/\.(png|gif|webp)$/i, '');
  // Normalize by removing spaces before tokenizing to handle "Spread 20" vs "Spread20"
  const normalize = s => stripExt(s).replace(/\s+/g, '');
  // Work with filename from the object
  const aName = normalize(a.filename);
  const bName = normalize(b.filename);
  
  // Split into tokens of numbers and non-numbers
  const tokenize = str => {
    const tokens = [];
    const parts = str.match(/(\d+|\D+)/g) || [];
    for (const part of parts) {
      if (/^\d+$/.test(part)) {
        tokens.push({ type: 'number', value: parseInt(part, 10) });
      } else {
        tokens.push({ type: 'string', value: part });
      }
    }
    return tokens;
  };
  
  const aTokens = tokenize(aName);
  const bTokens = tokenize(bName);
  
  // Compare token by token
  const maxLen = Math.max(aTokens.length, bTokens.length);
  for (let i = 0; i < maxLen; i++) {
    const aToken = aTokens[i];
    const bToken = bTokens[i];
    
    // If one is missing, shorter comes first
    if (!aToken) return -1;
    if (!bToken) return 1;
    
    // Compare same type tokens
    if (aToken.type === 'number' && bToken.type === 'number') {
      if (aToken.value !== bToken.value) {
        return aToken.value - bToken.value;
      }
    } else if (aToken.type === 'string' && bToken.type === 'string') {
      const cmp = aToken.value.localeCompare(bToken.value);
      if (cmp !== 0) return cmp;
    } else {
      // Different types - numbers come before strings
      return aToken.type === 'number' ? -1 : 1;
    }
  }
  
  return 0;
}

// Sort
const sortedDesktop = desktopFiles.sort(naturalSort);
const sortedMobile = mobileFiles.sort(naturalSort);

console.log('Sorted Desktop:', sortedDesktop.length);
console.log('Sorted Mobile:', sortedMobile.length);

// Generate timestamp
const timestamp = Date.now();

// Convert to URLs with subdirectory paths
const desktopPanels = sortedDesktop.map(item => {
  const path = item.subdir 
    ? `/panels/chapter-1/desktop/${item.subdir}/${item.filename}`
    : `/panels/chapter-1/desktop/${item.filename}`;
  return path + '?v=' + timestamp;
});

const mobilePanels = sortedMobile.map(item => {
  const path = item.subdir 
    ? `/panels/chapter-1/mobile/${item.subdir}/${item.filename}`
    : `/panels/chapter-1/mobile/${item.filename}`;
  return path + '?v=' + timestamp;
});

// YouTube entries
const ytOpening = { type: 'youtube', id: 'Q-1wOb8LOAA', title: 'Little Town of Nowhere' };
const ytWolf = { type: 'youtube', id: '9t9IHg2DQ3I', title: 'The Wolf Who Cried' };

// Find Spread22 position
const mobileWolfIdx = sortedMobile.findIndex(item => item.filename.match(/Spread\s*22/i));
const desktopWolfIdx = sortedDesktop.findIndex(item => item.filename.match(/Spread\s*22/i));

console.log('Mobile Wolf index:', mobileWolfIdx);
console.log('Desktop Wolf index:', desktopWolfIdx);

// Insert opening at start
mobilePanels.unshift(ytOpening);
desktopPanels.unshift(ytOpening);

// Insert Wolf before Spread22 (+1 for the opening we just added)
if (mobileWolfIdx >= 0) {
  mobilePanels.splice(mobileWolfIdx + 1, 0, ytWolf);
}
if (desktopWolfIdx >= 0) {
  desktopPanels.splice(desktopWolfIdx + 1, 0, ytWolf);
}

// Build structure
const panelsData = [{
  title: 'chapter-1',
  slug: 'chapter-1',
  desktop: desktopPanels,
  mobile: mobilePanels,
  thumbnail: ''
}];

// Write
fs.writeFileSync('static/panels.json', JSON.stringify(panelsData, null, 2));

console.log('\nGenerated panels.json successfully!');
console.log('Desktop panels (with YouTube):', desktopPanels.length);
console.log('Mobile panels (with YouTube):', mobilePanels.length);
