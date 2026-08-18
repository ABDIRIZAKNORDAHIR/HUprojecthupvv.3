const heldUrls = new Set<string>();

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function dataUrlToBlob(data: string): Blob {
  const match = data.match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) throw new Error('This file is not encoded correctly.');
  const binary = atob(match[2].replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: match[1] || 'application/pdf' });
}

export function isPdfAttachment(name: string, data?: string | null) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return true;
  return Boolean(data?.startsWith('data:application/pdf'));
}

function holdUrl(url: string) {
  heldUrls.add(url);
}

export function downloadAttachment(name: string, data: string) {
  const blob = dataUrlToBlob(data);
  const url = URL.createObjectURL(blob);
  holdUrl(url);
  const link = document.createElement('a');
  link.href = url;
  link.download = name || 'assignment.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Opens the assignment in a new tab so the teacher can read it without downloading. */
export function openAttachmentReview(name: string, data: string) {
  const blob = dataUrlToBlob(data);
  const fileUrl = URL.createObjectURL(blob);
  holdUrl(fileUrl);

  const fileName = name || 'Student assignment.pdf';
  const safeName = escapeHtml(fileName);
  const pdf = isPdfAttachment(fileName, data);
  const viewer = pdf
    ? `<iframe src="${fileUrl}" title="${safeName}"></iframe>`
    : blob.type.startsWith('image/')
      ? `<div class="image-wrap"><img src="${fileUrl}" alt="${safeName}" /></div>`
      : `<div class="empty"><p>This file type cannot be shown in the browser.</p><a href="${fileUrl}" download="${safeName}">Download instead</a></div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Review · ${safeName}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body { display: grid; grid-template-rows: auto 1fr; font-family: "Segoe UI", system-ui, sans-serif; background: #0f172a; }
    header {
      display: flex; align-items: center; gap: 12px; min-height: 56px;
      padding: 10px 16px; background: #042f2e; color: #ecfdf5;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .mark {
      display: grid; place-items: center; width: 36px; height: 36px; flex-shrink: 0;
      border-radius: 10px; background: #0f766e; font-size: 11px; font-weight: 800; letter-spacing: .04em;
    }
    .copy { min-width: 0; }
    .copy p { margin: 0; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #5eead4; }
    .copy h1 { margin: 2px 0 0; font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .actions { margin-left: auto; display: flex; gap: 8px; }
    .actions a {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px;
      border-radius: 10px; background: rgba(255,255,255,.08); color: #fff;
      text-decoration: none; font-size: 12px; font-weight: 700;
    }
    .actions a:hover { background: rgba(255,255,255,.16); }
    iframe, .image-wrap, .empty { width: 100%; height: 100%; border: 0; background: #111827; }
    .image-wrap { overflow: auto; display: grid; place-items: start center; padding: 24px; background: #020617; }
    .image-wrap img { max-width: 100%; height: auto; }
    .empty { display: grid; place-items: center; color: #e2e8f0; text-align: center; gap: 8px; }
    .empty a { color: #5eead4; }
  </style>
</head>
<body>
  <header>
    <span class="mark">${pdf ? 'PDF' : 'FILE'}</span>
    <div class="copy">
      <p>Student assignment</p>
      <h1>${safeName}</h1>
    </div>
    <div class="actions">
      <a href="${fileUrl}" download="${safeName}">Download</a>
    </div>
  </header>
  ${viewer}
</body>
</html>`;

  const tab = window.open('', '_blank');
  if (!tab) {
    const fallback = window.open(fileUrl, '_blank');
    if (!fallback) {
      throw new Error('Allow pop-ups to review the assignment in a new tab.');
    }
    return;
  }
  tab.document.open();
  tab.document.write(html);
  tab.document.close();
  tab.focus();
}
