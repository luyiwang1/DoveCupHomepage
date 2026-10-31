const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('court admin login uses an in-page dialog and validates before enabling editing', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'courts.html'), 'utf8');
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { value: '', textContent: '', open: false, handlers: {},
      addEventListener(name, fn) { this.handlers[name] = fn; },
      showModal() { this.open = true; },
      close() { this.open = false; this.handlers.close?.(); },
      focus() {}, select() {} });
    return nodes.get(id);
  };
  const saved = new Map();
  const context = vm.createContext({ document: { getElementById: node },
    sessionStorage: { setItem: (k,v) => saved.set(k,v), removeItem: k => saved.delete(k) },
    render() {}, renderAdmin() {}, prompt() { throw new Error('Native prompt is forbidden'); } });
  vm.runInContext("let isAdminMode=false;const ADMIN_PASSWORD='8888',ADMIN_STORAGE='courts_is_admin';" +
    html.slice(html.indexOf('function toggleAdmin()'), html.indexOf('function requireAdmin()')), context);
  vm.runInContext('toggleAdmin()', context);
  assert.equal(node('courtAdminDialog').open, true);
  node('courtAdminPassword').value = 'wrong';
  node('courtAdminForm').handlers.submit({ preventDefault() {} });
  assert.equal(vm.runInContext('isAdminMode', context), false);
  assert.match(node('courtAdminError').textContent, /Incorrect password/);
  node('courtAdminPassword').value = '8888';
  node('courtAdminForm').handlers.submit({ preventDefault() {} });
  assert.equal(vm.runInContext('isAdminMode', context), true);
  assert.equal(saved.get('courts_is_admin'), '1');
  assert.equal(node('courtAdminDialog').open, false);
  assert.equal(node('courtAdminPassword').value, '');
  vm.runInContext('toggleAdmin()', context);
  assert.equal(saved.has('courts_is_admin'), false);
  assert.equal(vm.runInContext('isAdminMode', context), false);
});
