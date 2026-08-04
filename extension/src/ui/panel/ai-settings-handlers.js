/**
 * UI: PANEL -- AI SETTINGS HANDLERS
 * ==================================
 * Provider change and model fetch button handlers for AI settings.
 * Extracted from ai-settings.js for AHG Rule 12 (250-line hard cap).
 *
 * v1.9.78.0
 */

import { refs } from '../state.js';

const PROVIDER_DEFAULTS = {
  zai: { baseUrl: 'https://internal-api.z.ai/v1', apiKey: 'Z.ai', model: 'glm-4.5' },
  ollama: { baseUrl: 'http://localhost:11434/v1', apiKey: '', model: 'llama3' },
  custom: { baseUrl: '', apiKey: '', model: '' },
};

function setFieldValue(sr, id, value) {
  const el = sr.getElementById(id);
  if (el) el.value = value || '';
}

function getFieldValue(sr, id) {
  const el = sr.getElementById(id);
  return el ? (el.value || '') : '';
}

/** Show/hide Z.ai-specific fields based on provider. */
export function toggleZaiFields(sr, provider) {
  const zaiBlock = sr.getElementById('s-ai-zai-fields');
  if (zaiBlock) zaiBlock.style.display = provider === 'zai' ? '' : 'none';
}

/**
 * Bind provider change handler: auto-fill URL, toggle Z.ai fields.
 */
export function bindProviderHandler(container, readAiFields, saveAiConfig, msgImpl) {
  const providerEl = container.querySelector('#s-ai-provider');
  if (!providerEl) return;
  providerEl.addEventListener('change', () => {
    const sr = refs.shadowRoot;
    if (!sr) return;
    const provider = providerEl.value;
    const defs = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.zai;
    toggleZaiFields(sr, provider);
    setFieldValue(sr, 's-ai-base-url', defs.baseUrl);
    setFieldValue(sr, 's-ai-api-key', defs.apiKey);
    setFieldValue(sr, 's-ai-model', defs.model);
    if (provider !== 'zai') {
      setFieldValue(sr, 's-ai-token', '');
      setFieldValue(sr, 's-ai-chat-id', '');
      setFieldValue(sr, 's-ai-user-id', '');
    }
    const cfg = readAiFields();
    saveAiConfig(cfg, msgImpl).catch(() => {});
  });
}

/**
 * Bind model fetch button (Ollama) click handler.
 */
export function bindModelFetchHandler(container, sendBg, setFieldValue_, saveAiConfig, msgImpl) {
  const fetchBtn = container.querySelector('#s-ai-fetch-models');
  if (!fetchBtn) return;
  fetchBtn.addEventListener('click', async () => {
    const sr = refs.shadowRoot;
    if (!sr) return;
    const listEl = sr.getElementById('s-ai-model-list');
    const baseUrl = getFieldValue(sr, 's-ai-base-url');
    fetchBtn.disabled = true;
    fetchBtn.textContent = '...';
    try {
      const result = await sendBg({ type: 'ai-fetch-ollama-models', baseUrl }, msgImpl);
      if (result && result.models && result.models.length > 0) {
        listEl.innerHTML = result.models.map(m =>
          `<span class="ai-model-tag" style="display:inline-block;padding:2px 6px;margin:2px;border:1px solid #e4e4e7;border-radius:4px;font-size:10px;cursor:pointer;" data-model="${m}">${m}</span>`
        ).join('');
        listEl.querySelectorAll('.ai-model-tag').forEach(tag => {
          tag.addEventListener('click', () => {
            setFieldValue_(sr, 's-ai-model', tag.dataset.model);
            saveAiConfig({ model: tag.dataset.model }, msgImpl).catch(() => {});
          });
        });
      } else {
        listEl.textContent = 'Модели не найдены. Проверь, что Ollama запущен.';
      }
    } catch (_e) {
      listEl.textContent = 'Ошибка подключения к Ollama.';
    }
    fetchBtn.disabled = false;
    fetchBtn.textContent = 'Загрузить';
  });
}
