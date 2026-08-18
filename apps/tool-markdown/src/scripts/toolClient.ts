export const EDITOR_HANDOFF_KEY = 'mm:editor:handoff:v1';
const MAX_HANDOFF_LENGTH = 524288;

declare global {
  interface Window {
    mmTrack?: (eventName: string, params?: Record<string, string>) => void;
  }
}

/** Records only a fixed action and tool identifier; never pass document text or field values. */
export function trackToolAction(tool: string, action: string): void {
  window.mmTrack?.('markdown_tool_action', { tool, action });
}

export type StatusKind = 'success' | 'error' | 'neutral';

export function announceStatus(target: HTMLElement | null, message: string, kind: StatusKind = 'neutral') {
  if (!target) return;
  target.textContent = message;
  target.dataset.kind = kind;
}

export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    helper.style.pointerEvents = 'none';
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand('copy');
    helper.remove();
    return copied;
  } catch {
    return false;
  }
}

export function saveEditorHandoff(markdown: string, source: string): boolean {
  if (!markdown || markdown.length > MAX_HANDOFF_LENGTH) return false;

  try {
    sessionStorage.setItem(EDITOR_HANDOFF_KEY, JSON.stringify({
      markdown,
      source,
      createdAt: Date.now(),
    }));
    return true;
  } catch {
    return false;
  }
}
