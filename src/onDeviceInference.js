import { loadAndCompile, loadLiteRt, Tensor } from '@litertjs/core';

const IMAGE_SIZE = 224;
const CLASS_NAMES = [
  'ants',
  'bees',
  'beetle',
  'catterpillar',
  'earthworms',
  'earwig',
  'grasshopper',
  'moth',
  'slug',
  'snail',
  'wasp',
  'weevil',
];

let modelPromise;

async function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await loadLiteRt('/litert-wasm/');
      return loadAndCompile('/model.tflite', { accelerator: 'wasm' });
    })();
  }
  return modelPromise;
}

async function imageToTensor(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
  bitmap.close();

  const pixels = context.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE).data;
  const rgb = new Float32Array(IMAGE_SIZE * IMAGE_SIZE * 3);

  for (let pixel = 0, value = 0; pixel < pixels.length; pixel += 4) {
    rgb[value++] = pixels[pixel];
    rgb[value++] = pixels[pixel + 1];
    rgb[value++] = pixels[pixel + 2];
  }

  return new Tensor(rgb, [1, IMAGE_SIZE, IMAGE_SIZE, 3]);
}

export async function predictOnDevice(file) {
  const model = await getModel();
  const input = await imageToTensor(file);
  let outputs;

  try {
    outputs = await model.run(input);
    const probabilities = Array.from(await outputs[0].data());
    const ranked = probabilities
      .map((score, index) => ({ label: CLASS_NAMES[index], score }))
      .sort((left, right) => right.score - left.score);

    return {
      prediction: ranked[0].label,
      confidence: ranked[0].score,
      top_k: Object.fromEntries(
        ranked.slice(0, 3).map(({ label, score }) => [label, score])
      ),
    };
  } finally {
    input.delete();
    outputs?.forEach((output) => output.delete());
  }
}
