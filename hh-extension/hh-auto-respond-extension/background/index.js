/**
 * Service Worker (Background Script)
 * ====================================
 * Manifest V3: Service Worker вместо background page.
 *
 * Обязанности:
 * - chrome.alarms для периодических задач (сброс лимитов в полночь)
 * - Message routing между popup и content scripts
 * - Логирование и аналитика
 * - Установка/обновление расширения
 */

// ─── Install / Update ──────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[HH-AR] Extension installed/updated', details);

  if (details.reason === 'install') {
    // Первый запуск — инициализация
    chrome.storage.local.set({
      settings: {
        mode: 'manual',
        dailyLimit: 200,
        minMatchScore: 60,
        letterTone: 'formal',
        searchInterval: 300,
        autoScroll: true,
        showMatchScore: true,
        confirmBeforeApply: true,
        coverLetterTemplate: ''
      },
      stats: {
        totalApplied: 0,
        appliedToday: 0,
        interviewInvites: 0,
        responsesReceived: 0,
        skipsToday: 0,
        errorsToday: 0,
        lastActivity: null
      },
      appliedVacancies: [],
      skippedVacancies: [],
      blacklistedCompanies: [],
      logs: [],
      installedAt: new Date().toISOString()
    });

    // Alarm для daily reset
    chrome.alarms.create('dailyReset', {
      when: getNextMidnight(),
      periodInMinutes: 24 * 60
    });
  }
});

// ─── Daily Reset Alarm ─────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReset') {
    console.log('[HH-AR] Daily reset alarm fired');
    chrome.storage.local.get('stats', (data) => {
      const stats = data.stats || {};
      stats.appliedToday = 0;
      stats.skipsToday = 0;
      stats.errorsToday = 0;
      chrome.storage.local.set({ stats });
    });
  }
});

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

// ─── Message Routing ───────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'get-stats':
      chrome.storage.local.get('stats', (data) => {
        sendResponse(data.stats || {});
      });
      return true; // async response

    case 'get-settings':
      chrome.storage.local.get('settings', (data) => {
        sendResponse(data.settings || {});
      });
      return true;

    case 'apply-vacancy':
      // Forward to active tab's content script
      chrome.tabs.query({ active: true, url: 'https://hh.ru/*' }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, message);
        }
      });
      break;

    case 'log':
      chrome.storage.local.get('logs', (data) => {
        const logs = data.logs || [];
        logs.push({ ...message.entry, ts: new Date().toISOString() });
        if (logs.length > 500) logs.splice(0, logs.length - 500);
        chrome.storage.local.set({ logs });
      });
      break;

    case 'check-auth-cookies':
      // Check for hh.ru auth cookies via chrome.cookies API
      chrome.cookies.get({ url: 'https://hh.ru', name: 'hhtoken' }, (cookie) => {
        if (chrome.runtime.lastError) {
          sendResponse({ hasAuthCookie: false });
          return;
        }
        sendResponse({ hasAuthCookie: !!cookie });
      });
      return true; // async response
  }
});

// ─── Badge Updates ─────────────────────────────

/**
 * Обновляет badge (цифра на иконке расширения) с количеством откликов сегодня.
 * Вызывается периодически или при изменении stats.
 */
export function updateBadge() {
  chrome.storage.local.get('stats', (data) => {
    const applied = data.stats?.appliedToday || 0;
    const text = applied > 0 ? String(applied) : '';
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: '#2964FF' });
  });
}

// Initial badge update
updateBadge();
