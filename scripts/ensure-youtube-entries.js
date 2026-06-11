/**
 * ensure-youtube-entries.js
 * 
 * Ensures that specific YouTube entries are present in _order.json at the correct positions.
 * This script is idempotent - it can be run multiple times safely.
 * 
 * Usage: node scripts/ensure-youtube-entries.js
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use PROJECT_ROOT env var in production, fallback to __dirname for local development
const PROJECT_ROOT = process.env.PROJECT_ROOT || path.join(__dirname, '..');
const ORDER_FILE = path.join(PROJECT_ROOT, 'static', 'panels', '_order.json');
const PANELS_DIR = path.join(PROJECT_ROOT, 'static', 'panels');

// Define the YouTube entries to ensure
const YOUTUBE_ENTRIES = [
    // Mobile entries
    {
        chapter: 'chapter-1',
        device: 'mobile',
        position: 0, // First position (index 0)
        entry: {
            type: 'youtube',
            id: 'Q-1wOb8LOAA',
            title: 'Little Town of Nowhere'
        },
        description: 'Opening video before Spread1.1.a'
    },
    {
        chapter: 'chapter-1',
        device: 'mobile',
        beforePanel: 'Spread22.1.1.png', // Insert before this panel
        entry: {
            type: 'youtube',
            id: '9t9IHg2DQ3I',
            title: 'The Wolf Who Cried'
        },
        description: 'Video immediately before Spread 22'
    },
    // Desktop entries
    {
        chapter: 'chapter-1',
        device: 'desktop',
        position: 0, // First position (index 0)
        entry: {
            type: 'youtube',
            id: 'Q-1wOb8LOAA',
            title: 'Little Town of Nowhere'
        },
        description: 'Opening video before Spread01.1 (desktop)'
    },
    {
        chapter: 'chapter-1',
        device: 'desktop',
        beforePanel: 'Spread22.1.1.png',
        entry: {
            type: 'youtube',
            id: '9t9IHg2DQ3I',
            title: 'The Wolf Who Cried'
        },
        description: 'Video immediately before Spread 22 (desktop)'
    }
];

/**
 * Check if two entries are equal (for YouTube objects)
 */
function entriesEqual(a, b) {
    if (typeof a === 'string' || typeof b === 'string') {
        return a === b;
    }
    if (typeof a === 'object' && typeof b === 'object') {
        return a.type === b.type && a.id === b.id;
    }
    return false;
}

/**
 * Natural sort helpers (matching generate-panels-json.js)
 */
function tokenizeForSort(s) {
    // Strip file extension before tokenizing to avoid extension interfering with sort
    const norm = String(s).replace(/\s+/g, '');
    const withoutExt = norm.replace(/\.(png|jpg|jpeg|gif|webp|webm)$/i, '');
    const parts = withoutExt.split(/(\d+)/).filter(Boolean).map(p => {
        if (/^\d+$/.test(p)) return Number(p);
        return p.toLowerCase();
    });
    return parts;
}

function naturalCompare(a, b) {
    const ta = tokenizeForSort(a);
    const tb = tokenizeForSort(b);
    for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
        const ia = ta[i];
        const ib = tb[i];
        if (ia === undefined) return -1;
        if (ib === undefined) return 1;
        if (typeof ia === 'number' && typeof ib === 'number') {
            if (ia !== ib) return ia - ib;
            continue;
        }
        if (typeof ia === 'number') return -1;
        if (typeof ib === 'number') return 1;
        const cmp = ia.localeCompare(ib);
        if (cmp !== 0) return cmp;
    }
    return 0;
}

/**
 * Read panel files from filesystem for a given chapter/device (recursive)
 */
function readFilesystemPanels(chapter, device) {
    const devicePath = path.join(PANELS_DIR, chapter, device);
    if (!fs.existsSync(devicePath)) {
        return [];
    }
    
    const files = [];
    
    // Recursive function to scan directories
    function scanDirectory(dirPath, relativePath) {
        const entries = fs.readdirSync(dirPath);
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry);
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
                // Recursively scan subdirectory
                scanDirectory(fullPath, path.join(relativePath, entry));
            } else if (stats.isFile() && /\.(png|jpg|jpeg|gif|webp|webm)$/i.test(entry)) {
                // Store relative path (chapter/device/subfolder/filename)
                const relativeFilePath = path.join(relativePath, entry).replace(/\\/g, '/');
                files.push(relativeFilePath);
            }
        }
    }
    
    // Start scanning from device directory
    scanDirectory(devicePath, `${chapter}/${device}`);
    
    // Sort using natural comparison
    files.sort(naturalCompare);
    return files;
}

/**
 * Remove all instances of an entry from an array
 */
function removeEntry(array, entry) {
    return array.filter(item => !entriesEqual(item, entry));
}

/**
 * Main function to ensure YouTube entries are in place
 */
export function ensureYouTubeEntries() {
    console.log('🎬 Ensuring YouTube entries in _order.json...\n');

    // Read the _order.json file (create if missing)
    let orderData;
    if (!fs.existsSync(ORDER_FILE)) {
        console.log(`ℹ️  _order.json not found, creating empty structure at ${ORDER_FILE}`);
        orderData = {};
    } else {
        try {
            const content = fs.readFileSync(ORDER_FILE, 'utf8');
            orderData = JSON.parse(content);
        } catch (err) {
            console.error(`❌ Error reading or parsing _order.json: ${err.message}`);
            process.exit(1);
        }
    }

    let modified = false;

    // Process each YouTube entry
    for (const config of YOUTUBE_ENTRIES) {
        const { chapter, device, position, beforePanel, entry, description } = config;

        console.log(`📹 Processing: ${entry.title} (${entry.id})`);
        console.log(`   Location: ${description}`);

        // Ensure chapter exists
        if (!orderData[chapter]) {
            console.log(`   ⚠️  Creating missing chapter: ${chapter}`);
            orderData[chapter] = { desktop: [], mobile: [], other: [] };
            modified = true;
        }

        // Ensure device array exists
        if (!orderData[chapter][device]) {
            console.log(`   ⚠️  Creating missing device array: ${device}`);
            orderData[chapter][device] = [];
            modified = true;
        }

        const array = orderData[chapter][device];

        // If array is empty or only has YouTube entries, populate with filesystem panels first
        const panelFiles = array.filter(item => typeof item === 'string');
        const hasOnlyYouTube = panelFiles.length === 0 && array.length > 0;
        
        if (array.length === 0 || hasOnlyYouTube) {
            console.log(`   📂 Array ${hasOnlyYouTube ? 'has only YouTube entries' : 'is empty'}, populating from filesystem...`);
            const filesystemPanels = readFilesystemPanels(chapter, device);
            if (filesystemPanels.length > 0) {
                // Set array to filesystem panels (discarding any stale YouTube entries)
                orderData[chapter][device] = filesystemPanels;
                console.log(`   ✅ Populated with ${filesystemPanels.length} panel files from filesystem`);
                modified = true;
            }
        }

        // Get updated array reference after potential filesystem population
        const updatedArray = orderData[chapter][device];

        // Remove any existing instances of this YouTube entry
        const cleanedArray = removeEntry(updatedArray, entry);
        const wasRemoved = cleanedArray.length !== updatedArray.length;
        
        if (wasRemoved) {
            console.log(`   🧹 Removed existing instance(s)`);
            modified = true;
        }

        // Insert at the correct position
        if (typeof position === 'number') {
            // Insert at specific index
            cleanedArray.splice(position, 0, entry);
            console.log(`   ✅ Inserted at position ${position}`);
            modified = true;
        } else if (beforePanel) {
            // Find the panel to insert before
            const panelIndex = cleanedArray.findIndex(item => {
                if (typeof item === 'string') {
                    return item.includes(beforePanel);
                }
                return false;
            });

            if (panelIndex !== -1) {
                cleanedArray.splice(panelIndex, 0, entry);
                console.log(`   ✅ Inserted before ${beforePanel} at index ${panelIndex}`);
                modified = true;
            } else {
                // Panel not found in target array - try opposite array from _order.json
                const oppositeDevice = device === 'desktop' ? 'mobile' : 'desktop';
                const oppositeArray = orderData[chapter][oppositeDevice] || [];
                const oppositeIndex = oppositeArray.findIndex(item => {
                    if (typeof item === 'string') {
                        return item.includes(beforePanel);
                    }
                    return false;
                });

                if (oppositeIndex !== -1) {
                    // Insert at the same index position from opposite array
                    cleanedArray.splice(oppositeIndex, 0, entry);
                    console.log(`   ✅ Panel not in ${device}, found in ${oppositeDevice} at index ${oppositeIndex}`);
                    console.log(`   ✅ Inserted at matching index ${oppositeIndex} for correct story position`);
                    modified = true;
                } else {
                    // Not found in _order.json - try filesystem
                    console.log(`   ⚠️  Panel ${beforePanel} not found in _order.json, checking filesystem...`);
                    
                    // Check filesystem for both target and opposite device
                    const filesystemPanels = readFilesystemPanels(chapter, device);
                    const filesystemIndex = filesystemPanels.findIndex(f => f.includes(beforePanel));
                    
                    if (filesystemIndex !== -1) {
                        cleanedArray.splice(filesystemIndex, 0, entry);
                        console.log(`   ✅ Found in ${device} filesystem at index ${filesystemIndex}`);
                        console.log(`   ✅ Inserted at matching index ${filesystemIndex}`);
                        modified = true;
                    } else {
                        // Try opposite device filesystem
                        const oppositeFilesystemPanels = readFilesystemPanels(chapter, oppositeDevice);
                        const oppositeFilesystemIndex = oppositeFilesystemPanels.findIndex(f => f.includes(beforePanel));
                        
                        if (oppositeFilesystemIndex !== -1) {
                            cleanedArray.splice(oppositeFilesystemIndex, 0, entry);
                            console.log(`   ✅ Found in ${oppositeDevice} filesystem at index ${oppositeFilesystemIndex}`);
                            console.log(`   ✅ Inserted at matching index ${oppositeFilesystemIndex} for correct story position`);
                            modified = true;
                        } else {
                            console.log(`   ⚠️  Warning: Could not find panel ${beforePanel} in ${device} or ${oppositeDevice} (filesystem or _order.json), appending to end`);
                            cleanedArray.push(entry);
                            modified = true;
                        }
                    }
                }
            }
        }

        // Update the array in the order data
        orderData[chapter][device] = cleanedArray;
        console.log('');
    }

    // Write back to file if modified
    if (modified) {
        try {
            fs.writeFileSync(ORDER_FILE, JSON.stringify(orderData, null, 2), 'utf8');
            console.log('✅ Successfully updated _order.json');
            console.log(`📁 File: ${ORDER_FILE}`);
        } catch (err) {
            console.error(`❌ Error writing _order.json: ${err.message}`);
            process.exit(1);
        }
    } else {
        console.log('✨ No changes needed - YouTube entries already in correct positions');
    }

    console.log('\n🎉 Done!');
}

// Run when called directly from CLI
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    ensureYouTubeEntries();
}
