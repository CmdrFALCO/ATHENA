import type { RenderResult } from '../types';

export function downloadResult(result: RenderResult): void {
  const blob =
    result.content instanceof Blob
      ? result.content
      : new Blob([result.content], { type: result.mimeType });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
