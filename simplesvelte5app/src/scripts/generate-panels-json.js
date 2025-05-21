const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '../static/panels/desktop');
const files = fs.readdirSync(dir)
  .filter(file => /\.(png|jpg|jpeg|gif|webm)$/i.test(file))
  .map(file => `/panels/desktop/${file}`);

fs.writeFileSync(
  path.resolve(__dirname, '../static/panels.json'),
  JSON.stringify(files, null, 2)
);