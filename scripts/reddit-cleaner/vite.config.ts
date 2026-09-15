import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "Reddit Cleaner",
        namespace: "https://github.com/userscripts/reddit-cleaner",
        version: "1.0.0",
        description:
          "Manage your Reddit subscriptions and upvoted posts — bulk unsubscribe and un-upvote with filtering, sorting, and batch selection.",
        author: "local",
        match: ["https://www.reddit.com/*", "https://old.reddit.com/*"],
        updateURL:
          "https://raw.githubusercontent.com/GitResetHard/userscripts/dist/reddit-cleaner.js",
        downloadURL:
          "https://raw.githubusercontent.com/GitResetHard/userscripts/dist/reddit-cleaner.js",
        supportURL: "https://github.com/GitResetHard/userscripts/issues",
        "run-at": "document-idle",
        grant: ["GM_getValue", "GM_setValue", "GM_registerMenuCommand"],
        icon: "https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png",
      },
      build: {
        fileName: "reddit-cleaner.js",
      },
    }),
  ],
});
