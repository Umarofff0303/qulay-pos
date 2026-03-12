type ReceiptField = {
  label: string;
  value: string;
  emphasize?: boolean;
};

type ReceiptLineItem = {
  name: string;
  meta?: string;
  quantity?: string;
  total: string;
};

type ReceiptSection = {
  title?: string;
  fields?: ReceiptField[];
  lineItems?: ReceiptLineItem[];
};

type ReceiptOptions = {
  documentTitle: string;
  storeName: string;
  title: string;
  subtitle?: string;
  footer?: string;
  accentColor?: string;
  sections: ReceiptSection[];
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderFields = (fields: ReceiptField[]) =>
  fields
    .map(
      (field) => `
        <div class="kv-row ${field.emphasize ? 'kv-row-emphasis' : ''}">
          <span class="kv-label">${escapeHtml(field.label)}</span>
          <span class="kv-value">${escapeHtml(field.value)}</span>
        </div>
      `
    )
    .join('');

const renderLineItems = (lineItems: ReceiptLineItem[]) =>
  `
      <div class="items-wrap">
        <div class="items-head">
        <span>Mahsulot</span>
        <span>Soni</span>
        <span>Jami</span>
        </div>
      ${lineItems
        .map(
          (item) => `
            <div class="item-row">
              <div class="item-main">
                <div class="item-name">${escapeHtml(item.name)}</div>
                ${
                  item.meta
                    ? `<div class="item-meta">${escapeHtml(item.meta)}</div>`
                    : ''
                }
              </div>
              <div class="item-qty">${escapeHtml(item.quantity || '-')}</div>
              <div class="item-total">${escapeHtml(item.total)}</div>
            </div>
          `
        )
        .join('')}
    </div>
  `;

export const buildReceiptHtml = ({
  documentTitle,
  storeName,
  title,
  subtitle,
  footer,
  accentColor = '#1570ef',
  sections,
}: ReceiptOptions) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(documentTitle)}</title>
    <style>
      :root {
        --accent: ${accentColor};
        --accent-soft: rgba(21, 112, 239, 0.08);
        --ink: #0f172a;
        --muted: #64748b;
        --line: #dbe4f0;
        --paper: #ffffff;
        --bg: #eef4fb;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 28px;
        font-family: Arial, sans-serif;
        background: linear-gradient(180deg, var(--bg) 0%, #f8fbff 100%);
        color: var(--ink);
      }
      .receipt {
        width: 100%;
        max-width: 760px;
        margin: 0 auto;
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.10);
      }
      .topbar {
        height: 8px;
        background: linear-gradient(90deg, var(--accent) 0%, #f97316 100%);
      }
      .hero {
        padding: 26px 28px 20px;
        background:
          radial-gradient(circle at top right, rgba(249, 115, 22, 0.10), transparent 30%),
          linear-gradient(180deg, rgba(21, 112, 239, 0.05), transparent 100%);
      }
      .store {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.03em;
        margin: 0 0 6px;
      }
      .title {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .subtitle {
        margin: 12px 0 0;
        font-size: 13px;
        color: var(--muted);
      }
      .content {
        padding: 22px 28px 28px;
      }
      .section + .section {
        margin-top: 18px;
      }
      .section-title {
        margin: 0 0 12px;
        font-size: 12px;
        font-weight: 800;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .kv-grid,
      .summary-card {
        border: 1px solid var(--line);
        border-radius: 18px;
        overflow: hidden;
        background: #fcfdff;
      }
      .kv-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--line);
        font-size: 14px;
      }
      .kv-row:last-child {
        border-bottom: none;
      }
      .kv-row-emphasis {
        background: rgba(21, 112, 239, 0.04);
      }
      .kv-label {
        color: var(--muted);
      }
      .kv-value {
        text-align: right;
        font-weight: 700;
      }
      .items-wrap {
        border: 1px solid var(--line);
        border-radius: 18px;
        overflow: hidden;
        background: #fcfdff;
      }
      .items-head,
      .item-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 88px 104px;
        gap: 12px;
        align-items: start;
        padding: 12px 16px;
      }
      .items-head {
        background: rgba(21, 112, 239, 0.06);
        font-size: 12px;
        font-weight: 800;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .item-row {
        border-top: 1px solid var(--line);
      }
      .item-name {
        font-size: 14px;
        font-weight: 700;
      }
      .item-meta {
        margin-top: 4px;
        font-size: 12px;
        color: var(--muted);
      }
      .item-qty,
      .item-total {
        text-align: right;
        font-size: 14px;
      }
      .item-total {
        font-weight: 800;
      }
      .footer {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px dashed var(--line);
        text-align: center;
        color: var(--muted);
        font-size: 13px;
      }
      @media print {
        body {
          padding: 0;
          background: #fff;
        }
        .receipt {
          max-width: none;
          border: none;
          border-radius: 0;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <div class="receipt">
      <div class="topbar"></div>
      <div class="hero">
        <div class="title">${escapeHtml(title)}</div>
        <h1 class="store">${escapeHtml(storeName)}</h1>
        ${
          subtitle
            ? `<p class="subtitle">${escapeHtml(subtitle)}</p>`
            : ''
        }
      </div>
      <div class="content">
        ${sections
          .map(
            (section) => `
              <section class="section">
                ${
                  section.title
                    ? `<h2 class="section-title">${escapeHtml(section.title)}</h2>`
                    : ''
                }
                ${
                  section.fields && section.fields.length > 0
                    ? `<div class="kv-grid">${renderFields(section.fields)}</div>`
                    : ''
                }
                ${
                  section.lineItems && section.lineItems.length > 0
                    ? renderLineItems(section.lineItems)
                    : ''
                }
              </section>
            `
          )
          .join('')}
        ${footer ? `<div class="footer">${escapeHtml(footer)}</div>` : ''}
      </div>
    </div>
  </body>
  </html>
`;

export const openPrintWindow = (documentTitle: string, receiptHtml: string) => {
  const printWindow = window.open('', '', 'height=720,width=820');
  if (!printWindow) return;

  printWindow.document.write(receiptHtml);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 250);
};
