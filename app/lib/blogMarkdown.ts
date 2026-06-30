export interface Heading { id: string; text: string; level: 2 | 3 }

function toId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function inlineFormat(raw: string): string {
  return raw
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

export function markdownToHtml(md: string): string {
  if (!md?.trim()) return '';

  const blocks = md.split(/\n{2,}/);

  return blocks.map((block) => {
    const b = block.trim();
    if (!b) return '';

    if (b.startsWith('### ')) {
      const text = b.slice(4).trim();
      return `<h3 id="${toId(text)}">${inlineFormat(text)}</h3>`;
    }
    if (b.startsWith('## ')) {
      const text = b.slice(3).trim();
      return `<h2 id="${toId(text)}">${inlineFormat(text)}</h2>`;
    }
    if (b.startsWith('> ')) {
      return `<blockquote>${inlineFormat(b.slice(2).trim())}</blockquote>`;
    }

    const lines = b.split('\n');
    if (lines.every((l) => l.trim().startsWith('- '))) {
      const items = lines.map((l) => `<li>${inlineFormat(l.trim().slice(2))}</li>`).join('');
      return `<ul>${items}</ul>`;
    }
    if (lines.every((l) => /^\d+\.\s/.test(l.trim()))) {
      const items = lines.map((l) => `<li>${inlineFormat(l.trim().replace(/^\d+\.\s/, ''))}</li>`).join('');
      return `<ol>${items}</ol>`;
    }

    return `<p>${inlineFormat(b.replace(/\n/g, ' '))}</p>`;
  }).join('\n');
}

export function extractHeadings(md: string): Heading[] {
  if (!md) return [];
  return md.split('\n')
    .filter((l) => l.startsWith('## ') || l.startsWith('### '))
    .map((l) => {
      const level = l.startsWith('### ') ? 3 : 2;
      const text = l.slice(level + 1).trim();
      return { id: toId(text), text, level: level as 2 | 3 };
    });
}
