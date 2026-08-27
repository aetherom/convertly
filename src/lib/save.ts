const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  pdf: 'application/pdf',
  txt: 'text/plain',
  html: 'text/html',
  csv: 'text/csv',
  zip: 'application/zip',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/**
 * Saves a blob. Uses the native Save As dialog (File System Access API) when
 * available; falls back to a programmatic download elsewhere. Resolves cleanly
 * if the user cancels.
 */
export async function saveBlob(blob: Blob, name: string): Promise<void> {
  const w = window as any;
  if (typeof w.showSaveFilePicker === 'function') {
    try {
      const ext = name.split('.').pop()?.toLowerCase() || 'bin';
      const mime = MIME_BY_EXT[ext] || blob.type || 'application/octet-stream';
      const handle = await w.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: name, accept: { [mime]: ['.' + ext] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      if (err && err.name === 'AbortError') return; // user cancelled — not an error
      // fall through to classic download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
