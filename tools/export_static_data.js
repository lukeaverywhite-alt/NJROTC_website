/* Converts the repository's trusted static data literals to JSON for migration. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const sandbox = { window: {} };
vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
for (const file of ['site-config.js','announcements.js','gallery.js','navigation.js','content.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'data', file), 'utf8'), sandbox, { filename: file, timeout: 1000 });
}
process.stdout.write(JSON.stringify(sandbox.window));
