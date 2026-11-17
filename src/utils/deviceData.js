/**
 * deviceData.js — what a signed-in person leaves in this browser, and removing it.
 *
 * Project memory, updates, picked projects and drafts all live in
 * localStorage, so they outlast signing out. On a shared or library computer,
 * the next person would see them. Account offers to remove them at sign-out.
 *
 * Deliberately NOT removed:
 * - Native projects (yourkly_native_*). They aren't tied to the GitHub sign-in
 *   and may exist nowhere else.
 * - Display preferences, such as "show technical words". They hold nothing personal.
 *
 * Every function takes the storage to use, so it can be tested outside a browser.
 */

const SIGNED_IN_PREFIXES = [
  'plainly_drafts_',
  'plainly_memory_',
  'plainly_updates_',
  'plainly_tasks_',
  'plainly_projects_',
]
const SIGNED_IN_KEYS = ['yourkly_onboarding_source']
const SESSION_PREFIXES = ['yourkly_projects_delivered_']

function keysOf(storage) {
  const keys = []
  try {
    for (let i = 0; i < storage.length; i++) keys.push(storage.key(i))
  } catch { /* storage may be blocked */ }
  return keys.filter(Boolean)
}

function isSignedInKey(key) {
  return SIGNED_IN_KEYS.includes(key) || SIGNED_IN_PREFIXES.some(prefix => key.startsWith(prefix))
}

/** How many files have unsaved changes in this browser (drafts GitHub doesn't have yet). */
export function countUnsavedDrafts(storage = globalThis.localStorage) {
  if (!storage) return 0
  return keysOf(storage)
    .filter(key => key.startsWith('plainly_drafts_'))
    .reduce((total, key) => {
      try {
        const drafts = JSON.parse(storage.getItem(key) || '{}')
        return total + Object.keys(drafts || {}).length
      } catch {
        return total
      }
    }, 0)
}

/**
 * Removes everything the signed-in workspace stored in this browser. Returns
 * how many entries were removed. It never throws: being signed out matters
 * more than a tidy result.
 */
export function clearSignedInData(storage = globalThis.localStorage, session = globalThis.sessionStorage) {
  let removed = 0
  for (const [store, test] of [[storage, isSignedInKey], [session, key => SESSION_PREFIXES.some(p => key.startsWith(p))]]) {
    if (!store) continue
    for (const key of keysOf(store).filter(test)) {
      try { store.removeItem(key); removed++ } catch { /* keep going */ }
    }
  }
  return removed
}
