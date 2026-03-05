export function ensureLocationSelectionStyles() {
  const displayEl = document.querySelector('.jspsych-display-element');
  if (displayEl) {
    displayEl.classList.add('location-selection-scroll-enabled');
  }

  const styleId = 'location-selection-shared-ui-styles';
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.textContent = `
    .jspsych-display-element.location-selection-scroll-enabled {
      overflow-y: auto !important;
      overflow-x: hidden;
    }
    .jspsych-display-element.location-selection-scroll-enabled .jspsych-content-wrapper {
      height: auto;
      min-height: 100%;
      align-items: flex-start;
    }
    .jspsych-display-element.location-selection-scroll-enabled .jspsych-content {
      height: auto;
      min-height: 100%;
      justify-content: flex-start;
      padding-top: 1.25rem;
      padding-bottom: 1.25rem;
    }
    .lev-row-container.instruction.location-selection-panel {
      width: min(92vw, 680px);
      max-width: 680px;
      margin: 0 auto;
      text-align: left;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      gap: 0.35rem;
    }
    .lev-row-container.instruction.location-selection-panel h2 {
      margin: 0 0 0.6rem 0;
      line-height: 1.25;
      font-size: 1.35rem;
      width: 100%;
    }
    .lev-row-container.instruction.location-selection-panel p {
      margin: 0 0 0.7rem 0;
      line-height: 1.45;
      font-size: 0.96rem;
      width: 100%;
    }
    .location-selection-note {
      margin-top: 0.8rem;
      padding: 0.75rem 0.9rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .location-selection-note p:last-child,
    .location-selection-copy p:last-child {
      margin-bottom: 0;
    }
    .location-selection-field {
      margin-top: 0.85rem;
    }
    .location-selection-field label {
      display: block;
      margin-bottom: 0.3rem;
      font-weight: 600;
    }
    .lev-row-container.instruction.location-selection-panel .location-selection-status {
      margin-top: 0.8rem;
      min-height: 1.4em;
      line-height: 1.35;
      white-space: normal;
    }
    .location-selection-stack {
      display: block;
      width: 100%;
    }
    .location-selection-stack > * {
      width: 100%;
      box-sizing: border-box;
    }
    .location-selection-json {
      margin: 0;
      padding: 0.65rem;
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 6px;
      font-size: 0.8rem;
      line-height: 1.3;
      overflow: auto;
      max-height: 280px;
      white-space: pre;
    }
    .location-selection-debug-table-wrap {
      margin-top: 0.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: auto;
      max-height: 240px;
      background: #ffffff;
    }
    .location-selection-debug-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
      line-height: 1.25;
    }
    .location-selection-debug-table th,
    .location-selection-debug-table td {
      border-bottom: 1px solid #e2e8f0;
      padding: 0.35rem 0.45rem;
      text-align: left;
      white-space: nowrap;
    }
    .location-selection-debug-table th {
      position: sticky;
      top: 0;
      background: #f8fafc;
      z-index: 1;
      font-weight: 700;
    }
    .location-selection-pass {
      color: #166534;
      font-weight: 700;
    }
    .location-selection-fail {
      color: #b91c1c;
      font-weight: 700;
    }
    .location-selection-intro h2 {
      font-size: 1.15rem;
      margin-bottom: 0.4rem;
    }
    .location-selection-intro p {
      font-size: 0.9rem;
      line-height: 1.35;
      margin-bottom: 0.45rem;
      max-width: 34rem;
      white-space: normal;
      overflow-wrap: break-word;
    }
    .location-method-buttons {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.5rem;
      margin-top: 0.7rem;
    }
    .location-method-button {
      width: 100%;
      text-align: left;
      line-height: 1.25;
      padding: 0.65rem 0.75rem;
      white-space: normal;
    }
    .location-method-title {
      display: block;
      font-weight: 700;
      font-size: 0.95rem;
      margin-bottom: 0.15rem;
    }
    .location-method-meta {
      display: block;
      font-size: 0.82rem;
      opacity: 0.9;
    }
  `;
}
