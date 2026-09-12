import assert from 'node:assert/strict';
import test from 'node:test';

import { contestProblems, contestSchedule } from '../src/lib/contestRule.ts';

test('personal contest end overrides the global end', () => {
  assert.deepEqual(
    contestSchedule(
      { beginAt: '2026-09-12T10:00:00.000Z', endAt: '2026-09-12T12:00:00.000Z' },
      { beginAt: '2026-09-12T10:00:00.000Z', endAt: '2026-09-12T11:00:00.000Z' },
    ),
    { beginAt: '2026-09-12T10:00:00.000Z', endAt: '2026-09-12T11:00:00.000Z' },
  );
});

test('contest problems follow pids order without duplicate pid keys', () => {
  const problems = contestProblems({
    pdict: {
      295: { _id: 'a', domainId: 'system', docId: 295, docType: 10, pid: 'P295', title: 'A' },
      P295: { _id: 'a', domainId: 'system', docId: 295, docType: 10, pid: 'P295', title: 'A' },
      296: { _id: 'b', domainId: 'system', docId: 296, docType: 10, pid: 'P296', title: 'B' },
      P296: { _id: 'b', domainId: 'system', docId: 296, docType: 10, pid: 'P296', title: 'B' },
    },
  }, [296, 295]);

  assert.deepEqual(problems.map(({ docId, pid, title }) => ({ docId, pid, title })), [
    { docId: 296, pid: 'P296', title: 'B' },
    { docId: 295, pid: 'P295', title: 'A' },
  ]);
});
