// ===============================================
// ENGINE MODULES -- barrel index
// ===============================================

// Public API (orchestrator)
export { applyToAll, applyToVacancy, continueApply } from "./apply-orchestrator.js";

// Queue management (for external access e.g. diagnostics)
export { clearQueue, dequeueNext, getQueue, setQueue } from "./apply-queue.js";

// DOM actions (for testing / direct use)
export {
  clickApplyButton,
  setActiveResumeForCoverLetter,
  waitForPageReady,
  waitForPopupAndSubmit,
} from "./apply-actions.js";
