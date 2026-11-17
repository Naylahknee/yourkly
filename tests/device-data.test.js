import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clearSignedInData, countUnsavedDrafts } from '../src/utils/deviceData.js'

function fakeStorage(entries = {}) {
  const map = new Map(Object.entries(entries))
  return {
    get length() { return map.size },
    key: i => [...map.keys()][i] ?? null,
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    keys: () => [...map.keys()].sort(),
  }
}

test('counts unsaved drafts across projects and ignores broken entries', () => {
  const storage = fakeStorage({
    plainly_drafts_alice_novel: JSON.stringify({ 'a.md': {}, 'b.md': {} }),
    plainly_drafts_alice_blog: JSON.stringify({ 'c.md': {} }),
    plainly_drafts_alice_bad: '{not json',
    plainly_memory_alice_novel: '{}',
  })
  assert.equal(countUnsavedDrafts(storage), 3)
})

test('removes signed-in data but keeps native projects and preferences', () => {
  const storage = fakeStorage({
    plainly_drafts_alice_novel: '{}',
    plainly_memory_alice_novel: '{}',
    plainly_updates_alice_novel: '[]',
    plainly_tasks_alice_novel: '[]',
    plainly_projects_alice: '[]',
    yourkly_onboarding_source: 'builder',
    yourkly_native_projects: '[]',
    yourkly_native_files: '{}',
    plainly_show_github_words: 'true',
  })
  const session = fakeStorage({ yourkly_projects_delivered_alice: 'true', other: 'x' })
  assert.equal(clearSignedInData(storage, session), 7)
  assert.deepEqual(storage.keys(), ['plainly_show_github_words', 'yourkly_native_files', 'yourkly_native_projects'])
  assert.deepEqual(session.keys(), ['other'])
})

test('never throws when storage is missing or blocked', () => {
  const blocked = { get length() { throw new Error('blocked') }, key() { throw new Error('blocked') } }
  assert.equal(clearSignedInData(blocked, undefined), 0)
  assert.equal(countUnsavedDrafts(blocked), 0)
})
