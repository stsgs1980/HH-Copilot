/**
 * CONTENT: SYNC HANDLER
 * ========================
 * Handles the hh-ar-sync-resumes event — fetch-based
 * resume sync that works from ANY hh.ru page.
 */

import { createLogger } from '../lib/anti-hallucination.js';
import { getMyResumes, saveMyResume, clearMyResumes, setActiveResume } from '../lib/storage.js';
import { syncAllResumes } from '../lib/resume-fetch.js';
import { panelState, setStatus } from '../ui/panel.js';
import { renderMyResumesPanel, renderResumePanel } from '../ui/tabs/resumes.js';
import { refs, setActiveResumeState, setMyResumes } from '../ui/state.js';

const syncLog = createLogger('Main');
let syncInProgress = false;

/**
 * Handle the hh-ar-sync-resumes event.
 * Fetches all resumes via syncAllResumes, saves results to storage.
 */
export async function handleSyncResumes() {
  if (!panelState.isLoggedIn) return;
  if (syncInProgress) {
    syncLog.warn('Sync already in progress');
    return;
  }
  syncInProgress = true;

  // Update UI: show syncing state
  setStatus('Синхронизация резюме...');
  syncLog.info('Sync: starting fetch-based resume sync');

  try {
    await clearMyResumes();
    setMyResumes([]);
    renderMyResumesPanel();

    const results = await syncAllResumes({
      onProgress: (done, total, msg) => {
        syncLog.info('Sync: [' + done + '/' + total + '] ' + msg);
        setStatus('Синхр.: ' + done + '/' + total + ' — ' + msg);
        renderSyncProgress(done, total, msg);
      },
      onError: (item, err) => {
        syncLog.error('Sync: error for ' + (item ? item.title : 'unknown') + ': ' + err.message);
      }
    });

    // Save all parsed resumes to storage
    for (const resume of results) {
      await saveMyResume(resume);
    }

    // Update state and UI
    setMyResumes(await getMyResumes());
    renderMyResumesPanel();

    if (results.length > 0) {
      // Prefer first visible resume as the active one
      const firstVisible = results.find(r => {
        const vis = r.visibility || (r.hidden ? 'hidden' : 'unknown');
        return vis !== 'hidden';
      });
      const active = firstVisible || results[0];
      setActiveResumeState(active);
      await setActiveResume(active);
      renderResumePanel();
    }

    setStatus('Синхронизировано ' + results.length + ' резюме');
    syncLog.info('Sync: complete. ' + results.length + ' resumes saved');

  } catch (err) {
    syncLog.error('Sync: fatal error: ' + err.message);
    setStatus('Ошибка синхронизации: ' + err.message);
  } finally {
    syncInProgress = false;
    // Signal completion for button loading state
    window.dispatchEvent(new CustomEvent('hh-ar-sync-done'));
  }
}

/**
 * Render sync progress bar in the resume panel.
 */
function renderSyncProgress(done, total, msg) {
  const listEl = refs.shadowRoot?.getElementById('res-sync-list');
  if (!listEl) return;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  listEl.innerHTML =
    '<div style="padding:8px;text-align:center;">' +
      '<div style="font-size:12px;font-weight:600;margin-bottom:6px;">' + esc(msg) + '</div>' +
      '<div style="background:#e4e4e7;border-radius:4px;height:6px;overflow:hidden;">' +
        '<div style="background:#059669;height:100%;width:' + pct + '%;border-radius:4px;transition:width 0.3s;"></div>' +
      '</div>' +
      '<div style="font-size:10px;color:#71717a;margin-top:4px;">' + done + ' / ' + total + '</div>' +
    '</div>';
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
