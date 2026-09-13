import { config } from './config';
import { spoofNetworkHints } from './network/connection';
import { hookFetch } from './network/fetch-hook';
import { hookXHR } from './network/xhr-hook';
import { bindGestureTracking } from './fullscreen/gestures';
import { bindFullscreenChangeListener } from './fullscreen/index';
import { observeDom } from './dom/observer';

// Network hooks run immediately at document-start before any Instagram code loads.
spoofNetworkHints();
hookFetch();
hookXHR();

// Input handling and fullscreen state wiring.
bindGestureTracking();
bindFullscreenChangeListener();

// DOM observation for media upgrading and fullscreen button injection.
observeDom();

console.info(`${config.logPrefix} active (HD + fullscreen)`);
