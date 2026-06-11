const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { cellToBoundary, cellToParent, getResolution } = require('h3-js');

const WORLDPOP_STATS_URL = 'https://api.worldpop.org/v1/services/stats';
const WORLDPOP_TASK_URL = 'https://api.worldpop.org/v1/tasks';

const konturShardCache = new Map();
const konturShardInFlight = new Map();
const defaultShardBaseUrl = 'https://storage.googleapis.com/levante-assets-dev/maps/kontur-h3-r5';
const defaultShardBasePath = path.resolve(process.cwd(), 'data', 'kontur-h3-r5');

function sendJson(res, statusCode, payload) {
  res.status(statusCode).set('Content-Type', 'application/json').send(JSON.stringify(payload));
}

function parsePositiveInt(value, fallback) {
  const n = Number(value);
  if (Number.isFinite(n) && n >= 0) return Math.round(n);
  return fallback;
}

function parseResolution(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 15) return null;
  return n;
}

function parseCellIds(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((cellId) => String(cellId).trim())
    .filter((cellId) => cellId.length > 0);
}

function buildCellPolygon(cellId) {
  const boundary = cellToBoundary(cellId);
  if (!Array.isArray(boundary) || !boundary.length) {
    throw new Error('Invalid H3 cell boundary');
  }
  const ring = boundary.map((pair) => [Number(pair[1]), Number(pair[0])]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return {
    type: 'Polygon',
    coordinates: [ring],
  };
}

function getShardCacheLimit() {
  const raw = Number(process.env.KONTUR_H3_CACHE_MAX_SHARDS || 64);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 64;
}

function parseKonturShardJson(json, sourceLabel) {
  const resolutions = json?.resolutions;
  if (!resolutions || typeof resolutions !== 'object') return null;
  return { resolutions, loadedFrom: sourceLabel };
}

async function loadKonturShardFromUrl(shardUrl) {
  try {
    const response = await fetch(shardUrl);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const isGzip =
      String(response.headers.get('content-encoding') || '').includes('gzip')
      || shardUrl.endsWith('.gz');
    const jsonText = isGzip ? zlib.gunzipSync(buffer).toString('utf-8') : buffer.toString('utf-8');
    const json = JSON.parse(jsonText);
    return parseKonturShardJson(json, shardUrl);
  } catch (_err) {
    return null;
  }
}

function getShardCacheKey(shardCellId) {
  return `r5:${shardCellId}`;
}

function getShardBaseUrl() {
  const raw = String(process.env.KONTUR_H3_CACHE_URL || '').trim();
  return raw || defaultShardBaseUrl;
}

function getShardBasePath() {
  const raw = String(process.env.KONTUR_H3_CACHE_PATH || '').trim();
  return raw || defaultShardBasePath;
}

function resolveShardUrl(shardCellId) {
  const base = getShardBaseUrl();
  if (!base) return '';
  return `${base}/${shardCellId}.json.gz`;
}

function resolveShardPath(shardCellId) {
  const base = getShardBasePath();
  if (!base) return '';
  return path.resolve(base, `${shardCellId}.json`);
}

async function loadKonturShard(shardCellId) {
  const cacheKey = getShardCacheKey(shardCellId);
  const existing = konturShardCache.get(cacheKey);
  if (existing) {
    konturShardCache.delete(cacheKey);
    konturShardCache.set(cacheKey, existing);
    return existing;
  }
  const inflight = konturShardInFlight.get(cacheKey);
  if (inflight) return inflight;

  const loader = (async () => {
    const shardUrl = resolveShardUrl(shardCellId);
    if (shardUrl) {
      const remote = await loadKonturShardFromUrl(shardUrl);
      if (remote) return remote;
    }
    const shardPath = resolveShardPath(shardCellId);
    if (shardPath && fs.existsSync(shardPath)) {
      try {
        const raw = fs.readFileSync(shardPath, 'utf-8');
        const json = JSON.parse(raw);
        return parseKonturShardJson(json, shardPath);
      } catch (_err) {
        return null;
      }
    }
    return null;
  })();
  konturShardInFlight.set(cacheKey, loader);
  try {
    const loaded = await loader;
    if (loaded) {
      konturShardCache.set(cacheKey, loaded);
      const limit = getShardCacheLimit();
      while (konturShardCache.size > limit) {
        const oldestKey = konturShardCache.keys().next().value;
        konturShardCache.delete(oldestKey);
      }
    }
    return loaded;
  } finally {
    konturShardInFlight.delete(cacheKey);
  }
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function parseWorldPopSum(payload) {
  const candidates = [
    payload?.data?.total_population,
    payload?.stats?.sum,
    payload?.data?.stats?.sum,
    payload?.result?.stats?.sum,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    const value = Number(candidates[i]);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return null;
}

function parseWorldPopTaskId(payload) {
  const candidates = [payload?.taskid, payload?.taskId, payload?.task_id, payload?.id];
  for (let i = 0; i < candidates.length; i += 1) {
    const value = String(candidates[i] || '').trim();
    if (value) return value;
  }
  return null;
}

async function queryWorldPopForPolygon(polygon, year) {
  const url = new URL(WORLDPOP_STATS_URL);
  url.searchParams.set('dataset', 'wpgppop');
  url.searchParams.set('year', String(year));
  url.searchParams.set('geojson', JSON.stringify(polygon));
  url.searchParams.set('runasync', 'false');
  const firstResponse = await fetch(url.toString(), { method: 'GET' });
  if (!firstResponse.ok) {
    throw new Error(`WorldPop stats request failed (${firstResponse.status})`);
  }
  const firstPayload = await firstResponse.json().catch(() => ({}));
  const directSum = parseWorldPopSum(firstPayload);
  if (typeof directSum === 'number') return directSum;

  const taskId = parseWorldPopTaskId(firstPayload);
  if (!taskId) {
    throw new Error('WorldPop response missing stats and task id');
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const taskResponse = await fetch(`${WORLDPOP_TASK_URL}/${encodeURIComponent(taskId)}`);
    if (!taskResponse.ok) {
      throw new Error(`WorldPop task polling failed (${taskResponse.status})`);
    }
    const taskPayload = await taskResponse.json().catch(() => ({}));
    const sum = parseWorldPopSum(taskPayload);
    if (typeof sum === 'number') return sum;

    const status = String(taskPayload?.status || taskPayload?.state || '').toLowerCase();
    if (status.includes('failed') || status.includes('error')) {
      throw new Error(`WorldPop task ${taskId} failed`);
    }
    await wait(600);
  }

  throw new Error(`WorldPop task ${taskId} timed out`);
}

async function resolveKonturPopulation(cellId, resolution) {
  if (resolution < 5) return null;
  let shardCellId = null;
  try {
    shardCellId = cellToParent(cellId, 5);
  } catch (_err) {
    return null;
  }
  const shard = await loadKonturShard(shardCellId);
  const byRes = shard?.resolutions?.[String(resolution)];
  if (!byRes || typeof byRes !== 'object') return null;
  const value = Number(byRes[cellId]);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

async function resolveKonturPopulationBatch(cellIds, fallbackToWorldpop) {
  const items = [];
  for (let i = 0; i < cellIds.length; i += 1) {
    const cellId = cellIds[i];
    let resolution = null;
    try {
      resolution = getResolution(cellId);
    } catch (_err) {
      items.push({
        cellId,
        resolution: null,
        population: null,
        source: 'unknown',
        error: 'invalid cellId',
      });
      continue;
    }
    const konturPopulation = await resolveKonturPopulation(cellId, resolution);
    if (typeof konturPopulation === 'number') {
      items.push({
        cellId,
        resolution,
        population: konturPopulation,
        source: 'kontur',
      });
      continue;
    }
    if (!fallbackToWorldpop) {
      items.push({
        cellId,
        resolution,
        population: null,
        source: 'unknown',
      });
      continue;
    }
    try {
      const polygon = buildCellPolygon(cellId);
      const worldpopPopulation = await queryWorldPopForPolygon(polygon, 2020);
      items.push({
        cellId,
        resolution,
        population: Math.round(worldpopPopulation),
        source: 'worldpop',
        fallbackFrom: 'kontur',
      });
    } catch (error) {
      items.push({
        cellId,
        resolution,
        population: null,
        source: 'unknown',
        error: error?.message || 'Unknown error',
      });
    }
  }
  return items;
}

function registerPopulationApi(app) {
  app.get('/api/population-kontur-h3', async (req, res) => {
    try {
      const cellId = String(req.query?.cellId || '').trim();
      const resolution = parseResolution(req.query?.resolution);
      const worldpopYear = parsePositiveInt(req.query?.year, 2020);
      if (!cellId || resolution == null) {
        sendJson(res, 400, { success: false, error: 'Missing/invalid cellId or resolution' });
        return;
      }

      const konturPopulation = await resolveKonturPopulation(cellId, resolution);
      if (typeof konturPopulation === 'number') {
        let cachePath = null;
        try {
          cachePath = resolveShardUrl(cellToParent(cellId, 5));
        } catch (_err) {
          cachePath = null;
        }
        sendJson(res, 200, {
          success: true,
          source: 'kontur',
          population: konturPopulation,
          resolution,
          cellId,
          cachePath,
        });
        return;
      }

      // Real-data fallback: use WorldPop when Kontur cache not available for this cell.
      const polygon = buildCellPolygon(cellId);
      const worldpopPopulation = await queryWorldPopForPolygon(polygon, worldpopYear);
      sendJson(res, 200, {
        success: true,
        source: 'worldpop',
        fallbackFrom: 'kontur',
        population: Math.round(worldpopPopulation),
        resolution,
        cellId,
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: error?.message || 'Unknown error' });
    }
  });

  app.get('/api/population-kontur-h3-batch', async (req, res) => {
    try {
      const cellIds = parseCellIds(req.query?.cellIds);
      if (!cellIds.length) {
        sendJson(res, 400, { success: false, error: 'Missing cellIds' });
        return;
      }
      const fallback = String(req.query?.fallback || '').trim().toLowerCase();
      const fallbackToWorldpop = fallback === 'worldpop';
      const items = await resolveKonturPopulationBatch(cellIds, fallbackToWorldpop);
      sendJson(res, 200, {
        success: true,
        source: 'kontur',
        cachePath: getShardBaseUrl(),
        items,
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: error?.message || 'Unknown error' });
    }
  });

  app.get('/api/population-worldpop-h3', async (req, res) => {
    try {
      const cellId = String(req.query?.cellId || '').trim();
      const resolution = parseResolution(req.query?.resolution);
      const worldpopYear = parsePositiveInt(req.query?.year, 2020);
      if (!cellId || resolution == null) {
        sendJson(res, 400, { success: false, error: 'Missing/invalid cellId or resolution' });
        return;
      }
      const polygon = buildCellPolygon(cellId);
      const population = await queryWorldPopForPolygon(polygon, worldpopYear);
      sendJson(res, 200, {
        success: true,
        source: 'worldpop',
        population: Math.round(population),
        resolution,
        cellId,
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: error?.message || 'Unknown error' });
    }
  });
}

module.exports = {
  registerPopulationApi,
};
