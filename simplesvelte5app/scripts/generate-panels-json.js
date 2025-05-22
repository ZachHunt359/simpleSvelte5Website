import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dir = path.resolve(__dirname, '../static/panels/desktop');
const files = fs.readdirSync(dir)
  .filter(file => /\.(png|jpg|jpeg|gif|webm)$/i.test(file))
  .map(file => `/panels/desktop/${file}`);

fs.writeFileSync(
  path.resolve(__dirname, '../static/panels.json'),
  JSON.stringify(files, null, 2)
);