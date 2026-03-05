export function ensureLocationSelectionStyles() {
  const styleId = 'location-selection-shared-ui-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .location-selection-panel {
      width: min(92vw, 680px);
      max-width: 680px;
      margin: 0 auto 0 0;
      text-align: left;
      box-sizing: border-box;
    }
    .location-selection-copy h2 {
      margin: 0 0 0.6rem 0;
      line-height: 1.25;
      font-size: 1.35rem;
    }
    .location-selection-copy p {
      margin: 0 0 0.7rem 0;
      line-height: 1.45;
      font-size: 0.96rem;
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
    .location-selection-status {
      margin-top: 0.8rem;
      min-height: 1.4em;
      line-height: 1.35;
    }
    .location-selection-intro h2 {
      font-size: 1.25rem;
    }
    .location-selection-intro p {
      font-size: 0.93rem;
      line-height: 1.4;
    }
  `;
  document.head.appendChild(style);
}
