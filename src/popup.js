const enabledInput = document.querySelector('#enabled');
const status = document.querySelector('#status');

async function load() {
  try {
    const stored = await chrome.storage.sync.get({ enabled: true });
    enabledInput.checked = stored.enabled !== false;
  } catch (err) {
    status.textContent = 'Could not read settings.';
    console.error(err);
  }
}

enabledInput.addEventListener('change', async () => {
  try {
    await chrome.storage.sync.set({ enabled: enabledInput.checked });
    status.textContent = enabledInput.checked ? 'Highlighting on.' : 'Highlighting off.';
  } catch (err) {
    status.textContent = 'Could not save.';
    console.error(err);
  }
});

document.querySelector('#options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

load();
