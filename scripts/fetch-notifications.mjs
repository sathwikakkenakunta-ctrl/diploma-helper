import { mkdir, rename, writeFile } from 'node:fs/promises';

const endpoint = 'https://www.sbtet.telangana.gov.in/api/api/AdminService/getCircularsActive';
const outputFile = 'data/notifications.json';
const allowedHosts = new Set(['sbtet.telangana.gov.in', 'www.sbtet.telangana.gov.in']);

function normalizeRows(value) {
  const rows = Array.isArray(value) ? value : value?.Table;
  if (!Array.isArray(rows)) throw new Error('SBTET response did not contain a Table array.');
  const seen = new Set();
  return rows.map(row => ({
    id: String(row.ID ?? '').trim(),
    title: String(row.Title ?? '').trim(),
    date: String(row.NotificationDate ?? '').trim(),
    url: String(row.Url ?? '').trim(),
    type: String(row.CircularType ?? '').trim(),
    timestamp: String(row.timeStamp ?? row.NotificationDate ?? '').trim(),
  })).filter(item => {
    let parsedUrl;
    try { parsedUrl = new URL(item.url); } catch { return false; }
    if (!item.title || !item.date || !allowedHosts.has(parsedUrl.hostname.toLowerCase())) return false;
    const key = item.id || `${item.title.toLowerCase()}|${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
}

const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
if (!response.ok) throw new Error(`SBTET endpoint returned HTTP ${response.status}.`);
let body = await response.json();
if (typeof body === 'string') body = JSON.parse(body);
const items = normalizeRows(body);
if (!items.length) throw new Error('SBTET returned no valid circulars; keeping the previous feed.');

await mkdir('data', { recursive: true });
const payload = JSON.stringify({ source: endpoint, fetchedAt: new Date().toISOString(), items }, null, 2) + '\n';
const temporaryFile = `${outputFile}.tmp`;
await writeFile(temporaryFile, payload, 'utf8');
await rename(temporaryFile, outputFile);
console.log(`Wrote ${items.length} validated circulars to ${outputFile}.`);
