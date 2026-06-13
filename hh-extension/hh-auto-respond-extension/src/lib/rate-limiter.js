/**
 * LIB: RATE LIMITER
 * ===================
 * Adaptive rate limiter for vacancy apply actions.
 * Prevents hitting hh.ru API limits and triggers captcha detection.
 */

import { getStats, getAllSettings } from './storage.js';

const rateLimiter = {
  limits: { maxPerDay: 200, maxPerHour: 30, minIntervalMs: 30000, burstMax: 5, burstPauseMs: 120000 },
  lastActionTime: 0, burstCount: 0, hourlyCount: 0, currentHour: new Date().getHours(), adaptiveFactor: 1.0,

  async check() {
    const stats = await getStats();
    const settings = await getAllSettings();
    const now = Date.now();
    if (stats.appliedToday >= (settings.dailyLimit || this.limits.maxPerDay))
      return { allowed: false, reason: 'Дневной лимит: ' + stats.appliedToday + '/' + settings.dailyLimit };
    const ch = new Date().getHours();
    if (ch !== this.currentHour) { this.hourlyCount = 0; this.currentHour = ch; }
    if (this.hourlyCount >= this.limits.maxPerHour)
      return { allowed: false, reason: 'Часовой лимит', waitMs: 3600000 };
    if (now - this.lastActionTime < this.limits.minIntervalMs * this.adaptiveFactor)
      return { allowed: false, reason: 'Слишком быстро', waitMs: this.limits.minIntervalMs };
    if (this.burstCount >= this.limits.burstMax)
      return { allowed: false, reason: 'Burst pause (5 подряд)', waitMs: this.limits.burstPauseMs };
    return { allowed: true };
  },
  recordAction() { this.lastActionTime = Date.now(); this.burstCount++; this.hourlyCount++; },
  adaptiveSlowdown(reason) {
    const f = { '429': 2.0, slow: 1.5, captcha: 1.3 }[reason] || 1.0;
    this.adaptiveFactor = Math.min(5.0, this.adaptiveFactor * f);
  },
  resetBurst() { this.burstCount = 0; }
};

export default rateLimiter;
