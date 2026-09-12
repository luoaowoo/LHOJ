import assert from 'node:assert/strict';
import test from 'node:test';
import { matchRoutes } from 'react-router-dom';

import { hydroAvatarUrl, hydroContentUrl, hydroNativeUrl, hydroPublicUrl } from '../src/lib/endpoint.ts';
import { hydroWorkspaceHref, normalizeHydroPath, parseHydroWorkspaceTarget } from '../src/lib/hydro-workspace.ts';
import { isSuperUser, privilegeNames } from '../src/lib/permissions.ts';

test('Hydro native URLs are always same-origin and idempotent', () => {
  assert.equal(hydroNativeUrl('/login'), '/hydro-native/login');
  assert.equal(hydroNativeUrl('/hydro-native/login'), '/hydro-native/login');
  assert.equal(hydroPublicUrl('/contest/1?view=all'), '/hydro-native/contest/1?view=all');
  assert.equal(hydroContentUrl('/hydro-native/file/1/a.zip'), '/hydro-native/file/1/a.zip');
  assert.equal(hydroNativeUrl('http://64.90.0.223:801/contest/1?view=all'), '/hydro-native/contest/1?view=all');
  assert.equal(hydroPublicUrl('https://oj.luoaowoo.cn/p/1/edit'), '/hydro-native/p/1/edit');
});

test('Hydro avatars use the upstream IP origin', () => {
  assert.equal(
    hydroAvatarUrl(undefined, 232),
    'http://64.90.0.223:801/file/232/.avatar.jpg',
  );
  assert.equal(
    hydroAvatarUrl('/fs/storage?target=user%2F232%2F.avatar.jpg', 232),
    'http://64.90.0.223:801/fs/storage?target=user%2F232%2F.avatar.jpg',
  );
  assert.equal(
    hydroAvatarUrl('https://www.gravatar.com/avatar/test', 232),
    'https://www.gravatar.com/avatar/test',
  );
});

test('record code downloads stay behind the same-origin Hydro proxy', () => {
  assert.equal(
    hydroPublicUrl('/record/abc123?download=true'),
    '/hydro-native/record/abc123?download=true',
  );
});
test('workspace targets reject external and protocol-relative paths', () => {
  assert.equal(normalizeHydroPath('https://example.com/'), null);
  assert.equal(normalizeHydroPath('//example.com/'), null);
  assert.equal(normalizeHydroPath('/contest/1?view=all#rank'), '/contest/1?view=all#rank');
});

test('workspace link and query parsing round-trip Hydro paths', () => {
  const paths = [
    '/problem/random', '/problem/create', '/p/1/edit', '/p/1/config', '/p/1/solution',
    '/record/1', '/contest/create', '/contest/1/edit', '/contest/1/management',
    '/contest/1/clarification', '/contest/1/code', '/contest/1/print', '/contest/1/balloon',
    '/homework/create', '/homework/1/edit', '/homework/1/file', '/homework/1/code', '/homework/1/scoreboard',
    '/training/create', '/training/1/edit', '/training/1/file',
    '/discuss/node/question/create', '/discuss/1', '/user/1', '/manage', '/home/security', '/lostpass',
  ];
  for (const path of paths) {
    const href = hydroWorkspaceHref(path, 'Hydro');
    assert.match(href, /^\/hydro\?/);
    assert.deepEqual(parseHydroWorkspaceTarget(href.slice(href.indexOf('?') + 1)), { path, title: 'Hydro' });
  }
  assert.equal(hydroWorkspaceHref('https://example.com/'), '/hydro');
});


test('all frontend feature links match an application route', () => {
  const routes = [
    { path: '/' }, { path: '/login' }, { path: '/problems' }, { path: '/problem/:id' },
    { path: '/problem/:id/solutions' }, { path: '/problem/:id/stats' }, { path: '/problem/:id/files' },
    { path: '/problem/:id/submit' }, { path: '/problem/:pid/hack/:rid' }, { path: '/records' },
    { path: '/records/:rid' }, { path: '/contests' }, { path: '/contests/:id' },
    { path: '/training' }, { path: '/training/:id' }, { path: '/homework' }, { path: '/homework/:id' },
    { path: '/discuss' }, { path: '/discuss/:id' }, { path: '/ranking' }, { path: '/about' },
    { path: '/user' }, { path: '/user/:uname' }, { path: '/settings' }, { path: '/management' },
    { path: '/status' }, { path: '/messages' }, { path: '/security' },
    { path: '/account-settings/account' }, { path: '/account-settings/preference' },
    { path: '/account-settings/domain' }, { path: '/hydro' },
  ];
  const links = [
    '/', '/login', '/problems', '/problem/295?tid=6aa34786b875e64e113ab92f',
    '/problem/295/solutions?tid=6aa34786b875e64e113ab92f', '/problem/295/stats?tid=6aa34786b875e64e113ab92f',
    '/problem/295/files?tid=6aa34786b875e64e113ab92f', '/problem/295/submit?tid=6aa34786b875e64e113ab92f',
    '/records', '/records/6aa34786b875e64e113ab92f', '/contests', '/contests/6aa34786b875e64e113ab92f',
    '/training', '/training/6aa34786b875e64e113ab92f', '/homework', '/homework/6aa34786b875e64e113ab92f',
    '/discuss', '/discuss/6aa34786b875e64e113ab92f', '/ranking', '/about', '/user', '/user/1',
    '/settings', '/management', '/status', '/messages', '/security', '/account-settings/account',
  ];
  for (const link of links) assert.ok(matchRoutes(routes, link), link);
  assert.ok(matchRoutes(routes, '/hydro?path=%2Fcontest%2F1%2Fedit'));
});

test('superuser detection covers su, root, admin and priv=-1', () => {
  assert.equal(isSuperUser({ role: 'su' }), true);
  assert.equal(isSuperUser({ role: 'root' }), true);
  assert.equal(isSuperUser({ role: 'admin' }), true);
  assert.equal(isSuperUser({ role: 'user', priv: -1 }), true);
  assert.equal(isSuperUser({ role: 'user', priv: '-1' }), true);
  assert.equal(isSuperUser({ role: 'user', priv: 0 }), false);
  assert.equal(isSuperUser(null), false);
});

test('privilege labels decode Hydro bit masks', () => {
  assert.deepEqual(privilegeNames(-1), ['全部权限']);
  assert.deepEqual(privilegeNames(0), ['已封禁']);
  assert.deepEqual(privilegeNames((1 << 0) | (1 << 2)), ['编辑系统', '用户资料']);
  assert.deepEqual(privilegeNames('invalid'), []);
});
