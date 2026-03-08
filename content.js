/* ── content.js ─────────────────────────────────────────────── */
// This content script is loaded on all pages but stays dormant.
// The popup uses chrome.scripting.executeScript to inject the fill
// function directly, so this file's main job is to act as a
// lightweight listener if ever needed for future message-based use.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'PING') {
    sendResponse({ alive: true });
  }
});
