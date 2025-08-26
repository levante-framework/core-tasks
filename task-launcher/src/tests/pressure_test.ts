<script setup lang="ts">
import { ref } from 'vue';

// Generate a lot of URLs; point to a static bucket/CDN that can serve many unique images.
// For pure stress, you can also append a cache-buster query param to defeat caching.
function makeUrls(count: number, w = 256, h = 256) {
  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    // Use a placeholder service or your own static asset host.
    // Ensure unique URLs to avoid cache; adjust domain as needed.
    urls.push(`https://picsum.photos/${w}/${h}?random=${i}&t=${Date.now()}`);
  }
  return urls;
}

type Mode = 'domImg' | 'fetchBlobOnly' | 'fetchAndDecode';

const totalCount = ref(3000);
const concurrency = ref(64);        // Increase to 128–256 to provoke quicker failures
const mode = ref<Mode>('fetchAndDecode');
const width = ref(256);
const height = ref(256);
const waveDelayMs = ref(0);         // Introduce delay between task starts
const stopOnFirstError = ref(false);
const errors = ref<string[]>([]);
const completed = ref(0);
const running = ref(false);

let abort = false;

function reset() {
  errors.value = [];
  completed.value = 0;
  abort = false;
}

async function run() {
  reset();
  running.value = true;
  const urls = makeUrls(totalCount.value, width.value, height.value);

  const queue = urls.map((u) => ({ url: u }));
  let active = 0;
  let idx = 0;

  const next = (): void => {
    if (abort) return;
    if (completed.value >= queue.length) return;
    while (active < concurrency.value && idx < queue.length && !abort) {
      const { url } = queue[idx++];
      active++;
      void handleOne(url)
        .catch((e) => {
          errors.value.push(`${url} -> ${e?.message || e}`);
          if (stopOnFirstError.value) {
            abort = true;
          }
        })
        .finally(() => {
          active--;
          completed.value++;
          // Schedule next tick
          if (waveDelayMs.value > 0) {
            setTimeout(next, waveDelayMs.value);
          } else {
            next();
          }
        });
    }
  };

  next();

  // Wait for drain
  await new Promise<void>((resolve) => {
    const iv = setInterval(() => {
      if ((completed.value >= queue.length || abort) && active === 0) {
        clearInterval(iv);
        resolve();
      }
    }, 100);
  });

  running.value = false;
}

async function handleOne(url: string) {
  if (mode.value === 'domImg') {
    await loadViaDom(url);
  } else if (mode.value === 'fetchBlobOnly') {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Read as blob to force body consumption but skip decode
    await res.blob();
  } else {
    // fetchAndDecode
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    // Force decode; this can stress decoding and memory paths
    const bmp = await createImageBitmap(blob);
    // Optional: briefly draw to an offscreen canvas to keep it realistic
    const cnv = new OffscreenCanvas(1, 1);
    const ctx = cnv.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, 1, 1);
    bmp.close?.();
  }
}

function loadViaDom(src: string) {
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.loading = 'eager';
    img.decoding = 'sync';
    img.onload = () => resolve();
    img.onerror = (e) => reject(new Error('img.onerror'));
    // Append to a hidden container to actually trigger network + decode
    const container = document.getElementById('img-bucket')!;
    container.appendChild(img);
    img.src = src;
  });
}
</script>

<template>
  <div style="display:flex; gap:16px; align-items:flex-start;">
    <div>
      <h3>Insufficient Resources Stress</h3>
      <div>
        <label>Total images</label>
        <input type="number" v-model.number="totalCount" />
      </div>
      <div>
        <label>Concurrency</label>
        <input type="number" v-model.number="concurrency" />
      </div>
      <div>
        <label>Mode</label>
        <select v-model="mode">
          <option value="domImg">domImg</option>
          <option value="fetchBlobOnly">fetchBlobOnly</option>
          <option value="fetchAndDecode">fetchAndDecode</option>
        </select>
      </div>
      <div>
        <label>Width</label>
        <input type="number" v-model.number="width" />
        <label>Height</label>
        <input type="number" v-model.number="height" />
      </div>
      <div>
        <label>Wave delay (ms)</label>
        <input type="number" v-model.number="waveDelayMs" />
      </div>
      <div>
        <label><input type="checkbox" v-model="stopOnFirstError" /> Stop on first error</label>
      </div>
      <div style="margin-top:8px;">
        <button :disabled="running" @click="run">Run</button>
        <button @click="reset">Reset</button>
      </div>
      <p>Completed: {{ completed }} / {{ totalCount }}</p>
      <p>Errors: {{ errors.length }}</p>
      <pre style="max-height:200px; overflow:auto;">{{ errors.join('\n') }}</pre>
    </div>
    <div id="img-bucket" style="width:0;height:0;overflow:hidden;"></div>
  </div>
</template>
