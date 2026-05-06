// Figma Plugin Sandbox – erstellt Image-Frames aus den Vischer-Screenshots

figma.showUI(__html__, { width: 420, height: 560, title: 'Vischer Pages Importer' });

figma.ui.onmessage = async (msg) => {

  if (msg.type === 'import') {
    const { pages } = msg;
    const GAP = 80;
    let xOffset = 0;

    figma.notify('Import gestartet…', { timeout: 2000 });

    for (const p of pages) {
      try {
        // Bytes aus Base64
        const bytes = base64ToBytes(p.imageBase64);
        const figmaImage = figma.createImage(bytes);

        const frame = figma.createFrame();
        frame.name = p.name;
        frame.resize(p.width, p.height);
        frame.x = xOffset;
        frame.y = 0;
        frame.fills = [{
          type: 'IMAGE',
          imageHash: figmaImage.hash,
          scaleMode: 'FILL',
        }];
        frame.clipsContent = false;

        figma.currentPage.appendChild(frame);
        xOffset += p.width + GAP;

        figma.ui.postMessage({ type: 'progress', name: p.name });
      } catch (err) {
        figma.ui.postMessage({ type: 'error', name: p.name, error: err.message });
      }
    }

    // Alle importierten Frames selektieren und ansehen
    const frames = figma.currentPage.children;
    figma.currentPage.selection = [...frames];
    figma.viewport.scrollAndZoomIntoView([...frames]);

    figma.ui.postMessage({ type: 'done' });
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
