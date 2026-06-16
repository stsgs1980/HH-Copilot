// ===============================================
// ENGINE MODULES -- barrel index
// ===============================================

// Public API (orchestrator)
export { applyToVacancy, continueApply, applyToAll } from './apply-orchestrator.js';

// Queue management (for external access e.g. diagnostics)
export { getQueue, setQueue, dequeueNext, clearQueue } from './apply-queue.js';

// DOM actions (for testing / direct use)
export { waitForPageReady, clickApplyButton, waitForPopupAndSubmit, setActiveResumeForCoverLetter } from './apply-actions.js';
