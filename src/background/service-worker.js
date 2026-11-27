import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../shared/settings.js';

/**
 * Background service worker:
 * - seeds default settings on install (keeping existing values on update),
 * - handles the keyboard shortcut,
 * - shows an "OFF" badge while the extension is disabled.
 */

async function updateBadge() {
  const { enabled } = await loadSettings();
  await chrome.action.setBadgeText({ text: enabled ? '' : 'OFF' });
  await chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
}

// Note: already-open claude.ai tabs pick the extension up on their next reload.
chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(null);
  await chrome.storage.sync.set({ ...DEFAULT_SETTINGS, ...current });
  await updateBadge();
});

chrome.runtime.onStartup.addListener(updateBadge);

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-rtl') return;
  const { enabled } = await loadSettings();
  await saveSettings({ enabled: !enabled });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && 'enabled' in changes) updateBadge();
});
