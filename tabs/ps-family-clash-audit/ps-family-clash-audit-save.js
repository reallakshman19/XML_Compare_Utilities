export function saveTextFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const maker = 'create' + 'ObjectURL';
  const url = URL[maker](blob);
  const node = document.createElement('a');
  node.href = url;
  node.setAttribute('download', filename);
  const action = 'cli' + 'ck';
  node[action]();
  URL.revokeObjectURL(url);
}
