getAppUrl((appUrl) => {
  document.getElementById('startBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: `${appUrl}?start=record` });
  });

  document.getElementById('dashboardBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: `${appUrl}?view=dashboard` });
  });
});

document.getElementById('settingsLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
