/** All styles for the Shadow DOM — fully isolated from Reddit's CSS. */
export const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :host {
    font-family: -apple-system, BlinkMacSystemFont, 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    color: #d7dadc;
    line-height: 1.5;
  }

  /* ── Trigger button ─────────────────────────────────────────────────── */
  #rc-btn {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483640;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #ff4500;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(255,69,0,0.45);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    outline: none;
  }
  #rc-btn:hover { transform: scale(1.08); box-shadow: 0 6px 22px rgba(255,69,0,0.55); }
  #rc-btn:active { transform: scale(0.96); }
  #rc-btn svg { width: 24px; height: 24px; fill: #fff; }

  /* ── Backdrop ───────────────────────────────────────────────────────── */
  #rc-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483641;
    background: rgba(0, 0, 0, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: rc-fadein 0.15s ease;
  }
  #rc-backdrop.hidden { display: none; }

  @keyframes rc-fadein {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* ── Panel ──────────────────────────────────────────────────────────── */
  #rc-panel {
    width: min(580px, 96vw);
    max-height: min(86vh, 760px);
    background: #1a1a1b;
    border: 1px solid #343536;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.8);
    animation: rc-slidein 0.18s cubic-bezier(.2,.8,.2,1);
  }
  @keyframes rc-slidein {
    from { opacity: 0; transform: translateY(10px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)   scale(1); }
  }

  /* ── Header ─────────────────────────────────────────────────────────── */
  #rc-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 20px 14px;
    border-bottom: 1px solid #343536;
    flex-shrink: 0;
  }
  #rc-title {
    font-size: 17px;
    font-weight: 700;
    color: #fff;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  #rc-title svg { width: 20px; height: 20px; fill: #ff4500; flex-shrink: 0; }
  #rc-user {
    font-size: 12px;
    color: #818384;
    background: #272729;
    border: 1px solid #343536;
    border-radius: 6px;
    padding: 4px 9px;
  }
  #rc-close {
    background: transparent;
    border: none;
    cursor: pointer;
    color: #818384;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, background 0.15s;
  }
  #rc-close:hover { color: #d7dadc; background: #272729; }
  #rc-close svg { width: 18px; height: 18px; }

  /* ── Tab bar ────────────────────────────────────────────────────────── */
  #rc-tabs {
    display: flex;
    border-bottom: 1px solid #343536;
    flex-shrink: 0;
    padding: 0 20px;
  }
  .rc-tab {
    padding: 11px 16px;
    font-size: 13px;
    font-weight: 600;
    color: #818384;
    cursor: pointer;
    border: none;
    background: transparent;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .rc-tab:hover { color: #d7dadc; }
  .rc-tab.active { color: #ff4500; border-bottom-color: #ff4500; }
  .rc-tab .rc-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #272729;
    border-radius: 10px;
    padding: 1px 7px;
    font-size: 11px;
    font-weight: 500;
    margin-left: 6px;
    min-width: 22px;
    color: #818384;
  }
  .rc-tab.active .rc-badge { background: rgba(255,69,0,0.18); color: #ff4500; }

  /* ── Toolbar ────────────────────────────────────────────────────────── */
  #rc-toolbar {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid #343536;
    flex-shrink: 0;
    align-items: center;
    flex-wrap: wrap;
  }
  #rc-filter {
    flex: 1;
    min-width: 140px;
    background: #272729;
    border: 1px solid #343536;
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 13px;
    color: #d7dadc;
    outline: none;
    transition: border-color 0.15s;
  }
  #rc-filter::placeholder { color: #5c5c60; }
  #rc-filter:focus { border-color: #ff4500; }

  #rc-sort {
    background: #272729;
    border: 1px solid #343536;
    border-radius: 8px;
    padding: 7px 10px;
    font-size: 12px;
    color: #d7dadc;
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  #rc-sort:focus { border-color: #ff4500; }

  .rc-toolbar-btn {
    background: #272729;
    border: 1px solid #343536;
    border-radius: 8px;
    padding: 7px 11px;
    font-size: 12px;
    color: #818384;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .rc-toolbar-btn:hover { color: #d7dadc; border-color: #5c5c60; }

  /* ── List ───────────────────────────────────────────────────────────── */
  #rc-list {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
  #rc-list::-webkit-scrollbar { width: 6px; }
  #rc-list::-webkit-scrollbar-track { background: transparent; }
  #rc-list::-webkit-scrollbar-thumb { background: #343536; border-radius: 3px; }
  #rc-list::-webkit-scrollbar-thumb:hover { background: #5c5c60; }

  /* ── List items ─────────────────────────────────────────────────────── */
  .rc-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid #272729;
    cursor: pointer;
    transition: background 0.12s;
    user-select: none;
  }
  .rc-item:last-child { border-bottom: none; }
  .rc-item:hover { background: #232324; }
  .rc-item.selected { background: rgba(255,69,0,0.08); }
  .rc-item.selected:hover { background: rgba(255,69,0,0.13); }

  .rc-item input[type="checkbox"] {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    accent-color: #ff4500;
    cursor: pointer;
  }

  .rc-item-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    flex-shrink: 0;
    object-fit: cover;
    background: #343536;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .rc-item-icon img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .rc-item-icon svg { width: 20px; height: 20px; fill: #818384; }

  .rc-item-thumb {
    width: 56px;
    height: 42px;
    border-radius: 6px;
    flex-shrink: 0;
    object-fit: cover;
    background: #272729;
    overflow: hidden;
  }
  .rc-item-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .rc-item-body { flex: 1; min-width: 0; }
  .rc-item-name {
    font-size: 13px;
    font-weight: 600;
    color: #d7dadc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rc-item-name.nsfw::after {
    content: 'NSFW';
    display: inline-block;
    margin-left: 6px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #ea0027;
    background: rgba(234,0,39,0.12);
    border-radius: 3px;
    padding: 1px 4px;
    vertical-align: middle;
  }
  .rc-item-sub {
    font-size: 11px;
    color: #818384;
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rc-item-meta {
    font-size: 11px;
    color: #5c5c60;
    text-align: right;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .rc-item-meta .score { color: #ff4500; font-weight: 600; }
  .rc-item a { color: inherit; text-decoration: none; }
  .rc-item a:hover { text-decoration: underline; }

  /* ── State views ────────────────────────────────────────────────────── */
  .rc-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 20px;
    text-align: center;
    color: #818384;
    font-size: 13px;
  }
  .rc-state svg { width: 40px; height: 40px; fill: #343536; }
  .rc-state .rc-state-title { font-size: 15px; font-weight: 600; color: #d7dadc; }
  .rc-state.error .rc-state-title { color: #ea0027; }

  /* ── Spinner ────────────────────────────────────────────────────────── */
  .rc-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #343536;
    border-top-color: #ff4500;
    border-radius: 50%;
    animation: rc-spin 0.7s linear infinite;
  }
  @keyframes rc-spin { to { transform: rotate(360deg); } }

  /* ── Progress bar ───────────────────────────────────────────────────── */
  #rc-progress {
    padding: 8px 16px 0;
    flex-shrink: 0;
  }
  .rc-progress-bar-wrap {
    height: 4px;
    background: #272729;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 6px;
  }
  .rc-progress-bar-fill {
    height: 100%;
    background: #ff4500;
    border-radius: 2px;
    transition: width 0.2s ease;
  }
  .rc-progress-text {
    font-size: 11px;
    color: #818384;
    text-align: right;
  }

  /* ── Footer ─────────────────────────────────────────────────────────── */
  #rc-footer {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-top: 1px solid #343536;
    flex-shrink: 0;
    background: #1a1a1b;
  }
  #rc-sel-count { font-size: 12px; color: #818384; flex: 1; }
  #rc-sel-count strong { color: #d7dadc; }

  .rc-btn-action {
    background: #ff4500;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 9px 18px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: filter 0.15s, transform 0.15s;
    white-space: nowrap;
  }
  .rc-btn-action:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
  .rc-btn-action:active:not(:disabled) { transform: translateY(0); }
  .rc-btn-action:disabled { opacity: 0.45; cursor: not-allowed; }
  .rc-btn-action.danger { background: #ea0027; }
  .rc-btn-action.confirm { background: #46d160; color: #0a0a0b; }

  #rc-confirm-bar {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #818384;
    padding: 0 16px 10px;
    flex-shrink: 0;
  }
  #rc-confirm-bar strong { color: #ea0027; }
`;
