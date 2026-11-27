import { loadSettings, onSettingsChanged } from '../shared/settings.js';
import { DirectionEngine } from './direction-engine.js';
import { StyleManager } from './style-manager.js';

/**
 * Content script entry point. Runs at document_start on https://claude.ai/*.
 */

const engine = new DirectionEngine();
const styles = new StyleManager();

/** @param {import('../shared/settings.js').Settings} settings */
function apply(settings) {
  styles.apply(settings);

  if (!settings.enabled) {
    engine.stop();
    return;
  }

  if (engine.running) engine.setMode(settings.direction);
  else engine.start(settings.direction);
}

async function init() {
  const settings = await loadSettings();
  apply(settings);

  // Content present at DOMContentLoaded is processed once more in a single pass;
  // everything after that is picked up by the MutationObserver.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => engine.running && engine.processAll(), {
      once: true,
    });
  }

  onSettingsChanged(apply);
}

init().catch((error) => console.error('[Claude RTL] Failed to initialise', error));
