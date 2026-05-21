// Walk a Tiptap JSON doc and collect plaintext. Used to fill posts.body_text /
// comments.body_text so the Postgres trigger can extract cashtags and mentions.

type TiptapNode = {
  type?: string;
  text?: string;
  content?: TiptapNode[];
  attrs?: Record<string, unknown>;
};

export function tiptapToText(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return '';
  const parts: string[] = [];
  walk(doc as TiptapNode, parts);
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
}

function walk(node: TiptapNode, out: string[]) {
  if (!node) return;
  if (typeof node.text === 'string') {
    out.push(node.text);
  }
  // Mention nodes persist the handle in attrs; emit "@<handle>" so the DB
  // trigger that parses body_text can create mention notifications.
  if (node.type === 'mention' && node.attrs) {
    const raw =
      (typeof node.attrs.id === 'string' && node.attrs.id) ||
      (typeof node.attrs.label === 'string' && node.attrs.label) ||
      '';
    if (raw) {
      const handle = raw.startsWith('@') ? raw.slice(1) : raw;
      out.push(`@${handle}`);
    }
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) walk(child, out);
  }
  // Block-level separators
  if (
    node.type === 'paragraph' ||
    node.type === 'heading' ||
    node.type === 'bulletList' ||
    node.type === 'orderedList' ||
    node.type === 'listItem' ||
    node.type === 'blockquote' ||
    node.type === 'codeBlock'
  ) {
    out.push('\n');
  }
}
