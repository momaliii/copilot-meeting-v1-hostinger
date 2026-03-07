const DEFAULT_APP_URL = '__APP_URL__';

document.getElementById('saveBtn').addEventListener('click', async () => {
  const input = document.getElementById('appUrl');
  const url = input.value.trim();
  const status = document.getElementById('status');

  if (url && !isValidUrl(url)) {
    status.textContent = 'Please enter a valid URL.';
    status.style.color = '#dc2626';
    status.classList.add('visible');
    return;
  }

  await chrome.storage.sync.set({ appUrl: url || null });
  status.textContent = 'Settings saved.';
  status.style.color = '#16a34a';
  status.classList.add('visible');
  setTimeout(() => status.classList.remove('visible'), 2000);
});

function isValidUrl(string) {
  try {
    const u = new URL(string);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

chrome.storage.sync.get(['appUrl'], (result) => {
  const url = result.appUrl || DEFAULT_APP_URL;
  document.getElementById('appUrl').value = url === '__APP_URL__' ? '' : url;
});
