import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Bunkr Suite',
        namespace: 'https://github.com/userscripts/bunkr-suite',
        version: '1.0.0',
        description:
          'CDN link injector, album stats, hover quick-preview, and already-seen deduplication for balbums.st and bunkr.cr',
        author: 'local',
        match: ['https://balbums.st/*', 'https://bunkr.cr/*'],
        updateURL:
          'https://raw.githubusercontent.com/GitResetHard/userscripts/dist/bunkr-suite.user.js',
        downloadURL:
          'https://raw.githubusercontent.com/GitResetHard/userscripts/dist/bunkr-suite.user.js',
        supportURL: 'https://github.com/GitResetHard/userscripts/issues',
        'run-at': 'document-idle',
        grant: [
          'GM_getValue',
          'GM_setValue',
          'GM_xmlhttpRequest',
          'GM_setClipboard',
          'GM_registerMenuCommand',
        ],
        connect: ['bunkr.cr', 's.bunkr.ru', 'static.scdn.st'],
        icon: 'https://balbums.st/img/favicon.svg',
      },
      build: {
        fileName: 'bunkr-suite.js',
      },
    }),
  ],
});
