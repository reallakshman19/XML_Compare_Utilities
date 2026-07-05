export function readBrowserTextFile(file) {
  if (!file || typeof file.text !== 'function') {
    return Promise.reject(new Error('No readable browser File object was provided.'));
  }
  return file.text();
}

export function describeBrowserFile(file) {
  if (!file) return 'No file selected';
  const size = Number.isFinite(file.size) ? `${file.size} bytes` : 'size unavailable';
  return `${file.name || 'unnamed file'} (${size})`;
}

export async function loadTextFileIntoTextarea(file, textarea, statusNode) {
  const text = await readBrowserTextFile(file);
  textarea.value = text;
  if (statusNode) statusNode.textContent = describeBrowserFile(file);
  return text;
}
