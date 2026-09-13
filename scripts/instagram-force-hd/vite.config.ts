import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Instagram Force HD Media',
        namespace: 'https://github.com/GitResetHard/userscripts',
        version: '1.2.0',
        description: 'Force Instagram HD media and optionally open videos in fullscreen.',
        author: 'local',
        match: ['https://www.instagram.com/*', 'https://instagram.com/*'],
        'run-at': 'document-start',
        grant: 'none',
      },
    }),
  ],
});
