// scripts/upload-server.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { generatePanelsJson } from './generate-panels-json.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors({ origin: 'http://localhost:5173' })); // Allow communication from the SvelteKit dev server

const upload = multer({ dest: 'uploads/' });

app.post('/api/panels/upload', upload.any(), (req, res) => {
    try {
        // Get all relative paths sent from the client
        const relPaths = req.body.relativePaths;
        // relPaths will be a string if one file, or array if multiple
        const relPathsArr = Array.isArray(relPaths) ? relPaths : [relPaths];

        req.files.forEach((file, idx) => {
            // Use the relative path for the destination
            const relPath = relPathsArr[idx] || file.originalname;
            const dest = path.join(__dirname, '../static/panels', relPath);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.renameSync(file.path, dest);
        });

        // Update panels.json after upload
        console.log("Calling generatePanelsJson...");
        generatePanelsJson();
        console.log("generatePanelsJson finished!");

        res.json({ success: true });
    } catch (err) {
        console.error('UPLOAD ERROR:', err);
        res.status(500).json({ error: 'Upload failed.' });
    }
});

// Recursively walk the panels directory and return all file paths relative to panels/
function walk(dir, base = '') {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const relPath = path.join(base, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath, relPath));
        } else {
            // Always use forward slashes for consistency
            results.push(relPath.replace(/\\/g, '/'));
        }
    });
    return results;
}

app.get('/api/panels/list', (req, res) => {
    const panelsDir = path.join(__dirname, '../static/panels');
    const files = walk(panelsDir);
    res.json(files);
});

app.listen(5174, () => console.log('Upload server running on 5174'));