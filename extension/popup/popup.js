/**
 * Popup script: DOM inspector toggle button.
 * v1.9.76.0
 */

const btn = document.getElementById('btn-inspector');
let inspectorActive = false;

btn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0] || !tabs[0].url || !tabs[0].url.includes('hh.ru')) {
      btn.textContent = 'Откройте вкладку hh.ru';
      setTimeout(() => { btn.textContent = inspectorActive ? 'DOM-инспектор: ВКЛ' : 'DOM-инспектор'; }, 1500);
      return;
    }
    chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle-inspector' }, (resp) => {
      if (chrome.runtime.lastError) {
        btn.textContent = 'Ошибка связи';
        setTimeout(() => { btn.textContent = 'DOM-инспектор'; }, 1500);
        return;
      }
      inspectorActive = resp && resp.active;
      btn.textContent = inspectorActive ? 'DOM-инспектор: ВКЛ' : 'DOM-инспектор';
      btn.classList.toggle('active', inspectorActive);
    });
  });
});

// Sync version from manifest
try {
  const ver = chrome.runtime.getManifest().version;
  const el = document.getElementById('version');
  if (el && ver) el.textContent = 'v' + ver;
} catch (_e) {}
