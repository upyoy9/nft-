
let layers = [];
let combinations = new Set();
let generatedImages = [];
let zip = new JSZip();

document.getElementById('upload-area').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.webkitdirectory = true;
  input.multiple = true;
  input.addEventListener('change', handleUpload);
  input.click();
});

function handleUpload(e) {
  layers = [];
  const files = Array.from(e.target.files);
  const folders = {};

  for (const file of files) {
    const [layerName, fileName] = file.webkitRelativePath.split('/').slice(-2);
    if (!folders[layerName]) folders[layerName] = [];
    folders[layerName].push(file);
  }

  Object.keys(folders).sort().forEach(name => {
    layers.push({ name, traits: folders[name] });
  });

  alert(`Loaded ${layers.length} layers with ${files.length} total traits.`);
}

document.getElementById('generateBtn').addEventListener('click', async () => {
  const totalCount = parseInt(document.getElementById('totalCount').value);
  const batchSize = parseInt(document.getElementById('batchSize').value);
  const imgSize = parseInt(document.getElementById('imgSize').value);

  if (!layers.length || isNaN(totalCount) || isNaN(batchSize) || isNaN(imgSize)) {
    alert('Please upload folders and fill all fields.');
    return;
  }

  combinations = new Set();
  generatedImages = [];
  zip = new JSZip();
  document.getElementById('preview-container').innerHTML = '';

  let count = 0;
  while (count < totalCount) {
    let batch = Math.min(batchSize, totalCount - count);
    for (let i = 0; i < batch; i++) {
      const combo = layers.map(layer => {
        const files = layer.traits;
        return files[Math.floor(Math.random() * files.length)];
      });

      const comboKey = combo.map(f => f.name).join('|');
      if (combinations.has(comboKey)) {
        i--;
        continue;
      }
      combinations.add(comboKey);

      const canvas = document.createElement('canvas');
      canvas.width = imgSize;
      canvas.height = imgSize;
      const ctx = canvas.getContext('2d');

      for (const file of combo) {
        const img = await loadImage(URL.createObjectURL(file));
        ctx.drawImage(img, 0, 0, imgSize, imgSize);
      }

      const index = count + 1;
      const dataURL = canvas.toDataURL();
      zip.file(`images/${index}.png`, dataURL.split(',')[1], { base64: true });

      const metadata = {
        name: `NFT #${index}`,
        traits: combo.map((f, i) => ({
          layer: layers[i].name,
          trait: f.name.split('.')[0]
        }))
      };

      generatedImages.push(metadata);

      const preview = canvas.cloneNode();
      const previewCtx = preview.getContext('2d');
      previewCtx.drawImage(canvas, 0, 0);
      document.getElementById('preview-container').appendChild(preview);

      count++;
    }
  }

  const csv = [
    'ID,' + layers.map(l => l.name).join(',')
  ];
  generatedImages.forEach((img, idx) => {
    const row = [
      idx + 1,
      ...layers.map(layer => {
        const t = img.traits.find(t => t.layer === layer.name);
        return t ? t.trait : '';
      })
    ];
    csv.push(row.join(','));
  });

  zip.file('traits.csv', csv.join('\n'));
  alert(`Generated ${totalCount} NFTs.`);
});

document.getElementById('downloadBtn').addEventListener('click', async () => {
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nfts.zip';
  a.click();
});

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}
