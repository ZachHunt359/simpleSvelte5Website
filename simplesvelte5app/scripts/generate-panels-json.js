import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const panelsDir = path.resolve(__dirname, '../static/panels');

// Helper: extract all numbers from a string as an array of integers
function extractNumbers(str) {
  return (str.match(/\d+/g) || []).map(Number);
}

// Sort by numbers in order, then by string as tie-breaker
function numericSort(a, b) {
  const numsA = extractNumbers(a);
  const numsB = extractNumbers(b);
  for (let i = 0; i < Math.max(numsA.length, numsB.length); i++) {
    const na = numsA[i] ?? 0;
    const nb = numsB[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return a.localeCompare(b);
}

// Helper: recursively find all image/video files in a folder
function findFilesRecursive(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const relPath = path.relative(panelsDir, filePath).replace(/\\/g, '/');
    if (fs.statSync(filePath).isDirectory()) {
      results = results.concat(findFilesRecursive(filePath));
    } else if (/\.(png|jpg|jpeg|gif|webm)$/i.test(file)) {
      results.push(`/panels/${relPath}`);
    }
  }
  return results;
}

// Get all chapter directories (ignore files)
const chapterDirs = fs.readdirSync(panelsDir)
  .filter(f => fs.statSync(path.join(panelsDir, f)).isDirectory());

// Sort chapters numerically
chapterDirs.sort(numericSort);

const data = chapterDirs.map(chapter => {
  const chapterPath = path.join(panelsDir, chapter);
  const desktopPath = path.join(chapterPath, 'desktop');
  const mobilePath = path.join(chapterPath, 'mobile');

  const desktopFiles = findFilesRecursive(desktopPath).sort(numericSort);
  const mobileFiles = findFilesRecursive(mobilePath).sort(numericSort);

  return {
    title: chapter,
    slug: chapter,
    desktop: desktopFiles,
    mobile: mobileFiles
  };
});

fs.writeFileSync(
  path.resolve(__dirname, '../static/panels.json'),
  JSON.stringify(data, null, 2)
);