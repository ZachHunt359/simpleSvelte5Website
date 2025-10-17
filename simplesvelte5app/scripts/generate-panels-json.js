import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { execSync } from 'child_process';



export function generatePanelsJson({ regenThumbnails = false, log = false } = {}) {
  console.log('Script running');
  // Use the project root (process.cwd()) so runtime imports from the built server
  // still resolve to the real project's static/panels directory instead of
  // the compiled .svelte-kit output path.
  const projectRoot = process.cwd();
  const panelsDir = path.resolve(projectRoot, 'static', 'panels');

  // Check if ffmpeg is installed
  const hasFFmpeg = checkFFmpeg(log);

  function checkFFmpeg(log) {
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
      return true;
    } catch (e) {
      if (log) {
        console.warn('WARNING: ffmpeg is not installed or not in your PATH. Thumbnails will not be generated.');
        console.warn('You can install ffmpeg using one of the following methods:');
        console.warn('- Windows: https://ffmpeg.org/download.html (add ffmpeg/bin to your PATH');
        console.warn('- Mac: brew install ffmpeg'); 
        console.warn('- Linux: sudo apt install ffmpeg');
      }
      return false;
    }
  }



  function generateThumbnail(panelPath, thumbPath) {
    // If panel is image, resize it; if video, extract frame
    if (/\.(png|jpg|jpeg)$/i.test(panelPath)) {
      execSync(`ffmpeg -y -i "${panelPath}" -vf scale=200:-1 "${thumbPath}"`);
    } else if (/\.(webm|mp4)$/i.test(panelPath)) {
      execSync(`ffmpeg -y -i "${panelPath}" -ss 00:00:01.000 -vframes 1 -vf scale=200:-1 "${thumbPath}"`);
    }
  }

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

    const desktopFiles = findFilesRecursive(desktopPath)
      .filter(f => !/\.thumb\.(jpg|jpeg|png)$/i.test(f))
      .sort(numericSort);
    const mobileFiles = findFilesRecursive(mobilePath)
      .filter(f => !/\.thumb\.(jpg|jpeg|png)$/i.test(f))
      .sort(numericSort);

    console.log('Desktop files:', desktopFiles);
    console.log('Mobile files:', mobileFiles);

    // Generate thumbnail in the chapter root
    let thumbnail = '';
    let lastPanel = desktopFiles.length
      ? desktopFiles[desktopFiles.length - 1]
      : (mobileFiles.length ? mobileFiles[mobileFiles.length - 1] : null);

    if (lastPanel) {
      const lastPanelAbs = path.join(panelsDir, lastPanel.replace(/^\/panels\//, ''));
      const thumbName = `${chapter}.thumb.jpg`;
      const thumbAbs = path.join(chapterPath, thumbName);
      const thumbRel = `/panels/${chapter}/${thumbName}`;

      if ((regenThumbnails || !fs.existsSync(thumbAbs)) && hasFFmpeg) {
        try {
          generateThumbnail(lastPanelAbs, thumbAbs);
          if (log) console.log(`Generated thumbnail: ${thumbAbs}`);
        } catch (e) {
          console.warn(`Failed to generate thumbnail for ${lastPanelAbs}: ${e.message}`);
          if (log) console.warn(`Failed to generate thumbnail for ${lastPanelAbs}: ${e.message}`);
        }
      }
      if (fs.existsSync(thumbAbs)) {
        thumbnail = thumbRel;
      }
    }

    return {
      title: chapter,
      slug: chapter,
      desktop: desktopFiles,
      mobile: mobileFiles,
      thumbnail
    };
  });

  const outFile = path.resolve(projectRoot, 'static', 'panels.json');
  const tmpFile = outFile + '.tmp';
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(tmpFile, json, 'utf8');
  fs.renameSync(tmpFile, outFile);
  console.log('Atomically wrote panels.json with data:', json);

}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // CLI mode
  const regenThumbnails = process.argv.includes('--regen-thumbnails');
  generatePanelsJson({ regenThumbnails, log: true });
}