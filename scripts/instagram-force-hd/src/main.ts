import { config } from './config';
import { initSettings, registerMenuCommands } from './settings';
import { spoofNetworkHints } from './network/connection';
import { hookFetch } from './network/fetch-hook';
import { hookXHR } from './network/xhr-hook';
import { bindGestureTracking } from './fullscreen/gestures';
import { bindFullscreenChangeListener } from './fullscreen/index';
import { observeDom } from './dom/observer';

// Settings must be loaded before anything reads from config.
initSettings();

spoofNetworkHints();
hookFetch();
hookXHR();
bindGestureTracking();
bindFullscreenChangeListener();
observeDom();
registerMenuCommands();

console.info(`${config.logPrefix} active (HD + fullscreen)`);
