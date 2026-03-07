// Shared logic for getting the app URL - used by popup, content script, and background
const DEFAULT_APP_URL = '__APP_URL__';

function getAppUrl(callback) {
  chrome.storage.sync.get(['appUrl'], (result) => {
    const url = result.appUrl || DEFAULT_APP_URL;
    callback(url === '__APP_URL__' ? 'http://localhost:3000' : url);
  });
}
