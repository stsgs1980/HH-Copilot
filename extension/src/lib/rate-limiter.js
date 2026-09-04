/**
 * LIB: RATE LIMITER
 * ===================
 * Adaptive rate limiter for vacancy apply actions.
 * Prevents hitting hh.ru API limits and triggers captcha detection.
 */

import { getAllSettings, getStats } from "./storage.js";

const STATE_KEY = "rateLimiterState";

const rateLimiter = {
  limits: { maxPerDay: 200, maxPerHour: 30, minIntervalMs: 30000, burstMax: 5, burstPauseMs: 120000 },
  lastActionTime: 0,
  burstCount: 0,
  hourlyCount: 0,
  currentHour: new Date().getHours(),
  adaptiveFactor: 1.0,
  _hydrated: false,

  async hydrate() {
    if (this._hydrated) return;
    this._hydrated = true;
    try {
      const d = await chrome.storage.local.get(STATE_KEY);
      const s = d[STATE_KEY];
      if (s && typeof s === "object") {
        // Hourly window is only valid within the same hour
        if (s.currentHour === new Date().getHours()) {
          this.hourlyCount = s.hourlyCount || 0;
          this.currentHour = s.currentHour;
        }
        this.adaptiveFactor = Math.min(5.0, s.adaptiveFactor || 1.0);
        this.burstCount = s.burstCount || 0;
        this.lastActionTime = s.lastActionTime || 0;
      }
    } catch (_e) {
      /* headless/test env without chrome -- silent */
    }
  },

  persist() {
    try {
      const p = chrome.storage.local.set({
        [STATE_KEY]: {
          hourlyCount: this.hourlyCount,
          currentHour: this.currentHour,
          adaptiveFactor: this.adaptiveFactor,
          burstCount: this.burstCount,
          lastActionTime: this.lastActionTime,
        },
      });
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (_e) {
      /* headless/test env without chrome -- silent */
    }
  },

  async check() {
    await this.hydrate();
    const stats = await getStats();
    const settings = await getAllSettings();
    const now = Date.now();
    if (stats.appliedToday >= (settings.dailyLimit || this.limits.maxPerDay))
      return { allowed: false, reason: "Дневной лимит: " + stats.appliedToday + "/" + settings.dailyLimit };
    const ch = new Date().getHours();
    if (ch !== this.currentHour) {
      this.hourlyCount = 0;
      this.currentHour = ch;
    }
    if (this.hourlyCount >= this.limits.maxPerHour) return { allowed: false, reason: "Часовой лимит", waitMs: 3600000 };
    if (now - this.lastActionTime < this.limits.minIntervalMs * this.adaptiveFactor)
      return { allowed: false, reason: "Слишком быстро", waitMs: this.limits.minIntervalMs };
    // Burst window expires after burstPauseMs of inactivity -- otherwise a
    // context restart would lock the limiter forever on stale burstCount
    if (now - this.lastActionTime > this.limits.burstPauseMs) this.burstCount = 0;
    if (this.burstCount >= this.limits.burstMax)
      return { allowed: false, reason: "Burst pause (5 подряд)", waitMs: this.limits.burstPauseMs };
    return { allowed: true };
  },
  recordAction() {
    this.lastActionTime = Date.now();
    this.burstCount++;
    this.hourlyCount++;
    this.persist();
  },
  adaptiveSlowdown(reason) {
    const f = { 429: 2.0, slow: 1.5, captcha: 1.3 }[reason] || 1.0;
    this.adaptiveFactor = Math.min(5.0, this.adaptiveFactor * f);
    this.persist();
  },
  resetBurst() {
    this.burstCount = 0;
    this.persist();
  },
};

export default rateLimiter;
