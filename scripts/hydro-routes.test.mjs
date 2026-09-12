import assert from 'node:assert/strict';
import test from 'node:test';

import { hydroContentUrl, hydroNativeUrl, hydroPublicUrl } from '../src/lib/endpoint.ts';
import { hydroWorkspaceHref, normalizeHydroPath, parseHydroWorkspaceTarget } from '../src/lib/hydro-workspace.ts';

test('Hydro native URLs are always same-origin and idempotent', () => {
  assert.equal(hydroNativeUrl('/login'), '/hydro-native/login');
  assert.equal(hydroNativeUrl('/hydro-native/login'), '/hydro-native/login');
  assert.equal(hydroPublicUrl('/contest/1?view=all'), '/hydro-native/contest/1?view=all');
  assert.equal(hydroContentUrl('/hydro-native/file/1/a.zip'), '/hydro-native/file/1/a.zip');
});

test('workspace targets reject external and protocol-relative paths', () => {
  assert.equal(normalizeHydroPath('https://example.com/'), null);
  assert.equal(normalizeHydroPath('//example.com/'), null);
  assert.equal(normalizeHydroPath('/contest/1?view=all#rank'), '/contest/1?view=all#rank');
});

test('workspace link and query parsing round-trip Hydro paths', () => {
  const href = hydroWorkspaceHref('/contest/1?view=all', '比赛管理');
  assert.match(href, /^\/hydro\?/);
  const search = href.slice(href.indexOf('?') + 1);
  assert.deepEqual(parseHydroWorkspaceTarget(search), { path: '/contest/1?view=all', title: '比赛管理' });
  assert.equal(hydroWorkspaceHref('https://example.com/'), '/hydro');
});
