/**
 * Service Worker (Background Script)
 * ====================================
 * Manifest V3: Service Worker instead of background page.
 *
 * Responsibilities:
 * - chrome.alarms for periodic tasks (daily limit reset at midnight)
 * - Message routing between popup and content scripts
 * - AI chat completions via z-ai API (F4.2)
 * - Logging and analytics
 * - Extension install/update handling
 */

import {
  sendMessage as aiSendMessage,
  getAiConfig,
  setAiConfig,
  isAiAvailable,
} from '../src/services/ai-service.js';
import {
  generateCoverLetterAI,
  generateChatReply,
} from '../src/services/ai-helpers.js';

// --- Install / Update --------------------------

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[HH-AR] Extension installed/updated', details);

  if (details.reason === 'install') {
    // First launch -- initialize defaults
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

    // Alarm for daily reset
    chrome.alarms.create('dailyReset', {
      when: getNextMidnight(),
      periodInMinutes: 24 * 60
    });
  }
});

// --- Daily Reset Alarm -------------------------

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

// --- Message Routing ---------------------------

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

    case 'ai-send-message':
      aiSendMessage(message.payload || {})
        .then(sendResponse)
        .catch((e) => sendResponse({ ok: false, error: e.message, code: 'UNCAUGHT' }));
      return true;

    case 'ai-cover-letter':
      // eslint-disable-next-line no-console
      console.log('[AI-BTN][bg] ai-cover-letter received', {
        vacancyId: message.vacancy && message.vacancy.id,
        vacancyTitle: message.vacancy && message.vacancy.title,
        resumeId: message.resume && message.resume.id,
        opts: message.opts,
      });
      generateCoverLetterAI(message.vacancy, message.resume, message.opts || {})
        .then((result) => {
          // eslint-disable-next-line no-console
          console.log('[AI-BTN][bg] ai-cover-letter done', {
            ok: !!(result && result.ok),
            code: result && result.code,
            aiCode: result && result.aiCode,
            textLen: result && result.text ? result.text.length : 0,
            warningsCount: result && Array.isArray(result.warnings) ? result.warnings.length : 0,
          });
          sendResponse(result);
        })
        .catch((e) => {
          // eslint-disable-next-line no-console
          console.error('[AI-BTN][bg] ai-cover-letter UNCAUGHT', e);
          sendResponse({ ok: false, error: e.message, code: 'UNCAUGHT' });
        });
      return true;

    case 'ai-chat-reply':
      generateChatReply(message.history, message.opts || {})
        .then(sendResponse)
        .catch((e) => sendResponse({ ok: false, error: e.message, code: 'UNCAUGHT' }));
      return true;

    case 'ai-get-config':
      getAiConfig().then(sendResponse);
      return true;

    case 'ai-set-config':
      setAiConfig(message.config || {}).then(sendResponse);
      return true;

    case 'ai-available':
      isAiAvailable().then(sendResponse);
      return true;
  }
});

// --- Badge Updates -----------------------------

/**
 * Updates the badge (number on extension icon) with today's apply count.
 * Called periodically or when stats change.
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
