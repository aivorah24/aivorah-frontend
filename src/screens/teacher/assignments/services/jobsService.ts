// Polls a queued job (see <service>/services/jobQueue.js) until it's
// done/failed, instead of blocking a single long-lived request — used by the
// worksheet upload/classify and quiz-generation steps so the browser tab (and
// any load balancer/proxy in front of it) never has to hold one connection
// open for the full AI pipeline duration. `serverUrl` must be the base URL of
// whichever backend the job was enqueued on (worksheet-extraction jobs live
// on aivorah-assignments-service, quiz-generation jobs still live on the
// monolith) — jobs aren't shared across backends, so polling the wrong one
// 404s forever.
export async function pollJob(jobId: string, serverUrl: string, { intervalMs = 1500, timeoutMs = 360000 } = {}): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${serverUrl}/jobs/${jobId}`);
    const job = await res.json().catch(() => ({}));
    if (job.status === 'done') return job.result;
    if (job.status === 'failed') throw new Error(job.error || 'Processing failed. Please try again.');
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('Timed out waiting for processing to finish. Please try again.');
}

// Publishes a worksheet-extraction job to the swappable db/Kafka queue (server
// polls it — see server/index.js) instead of blocking on the synchronous AI
// call directly. The point isn't just "don't freeze this tab" (the old
// sequential-for-loop already handled that for one teacher's own batch) — it's
// that a synchronous call gives the SERVER no coordination point across
// DIFFERENT teachers uploading at the same moment, only within one teacher's
// own request. Routing through the queue means every worksheet, from every
// teacher, funnels through the same drain (server/services/jobQueue.js
// runWorkerOnce), which is the actual "handle concurrent teacher uploads
// reliably" property. Falls back to the old synchronous endpoint if the queue
// call itself fails to enqueue, so a queue outage never blocks uploads outright.
export async function extractViaQueue(serverUrl: string, body: any): Promise<any> {
  try {
    const enqueueRes = await fetch(`${serverUrl}/assignments/extract-questions-async`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const enqueueData = await enqueueRes.json();
    if (!enqueueRes.ok || !enqueueData.jobId) throw new Error(enqueueData.error || 'Could not queue extraction');

    const deadline = Date.now() + 3 * 60 * 1000; // 3 min — matches the vision-call fallback-chain budget
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`${serverUrl}/jobs/${enqueueData.jobId}`);
      const statusData = await statusRes.json();
      if (statusData.status === 'done') return statusData.result;
      if (statusData.status === 'failed') throw new Error(statusData.error || 'Extraction job failed');
      // 'pending' or 'processing' — keep polling
    }
    throw new Error('Extraction timed out waiting for the queue to process it');
  } catch (queueErr: any) {
    console.log('[extractViaQueue] queue path failed, falling back to synchronous extraction:', queueErr?.message);
    const fallbackRes = await fetch(`${serverUrl}/assignments/extract-questions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const fallbackData = await fallbackRes.json();
    if (!fallbackRes.ok) throw new Error(fallbackData.error || 'Extraction failed');
    return fallbackData;
  }
}

export type WorksheetMeta = { grade: string; curriculum: string; chapter: string };

// Grade / curriculum / chapter code printed on the worksheet (or in its file
// name) — answered in about a second by assignments-service, so the upload
// form fills these before the slow AI extraction finishes. null on failure.
export async function detectWorksheetMeta(
  file: { base64: string; mime: string; name: string },
  serverUrl: string,
): Promise<WorksheetMeta | null> {
  try {
    const res = await fetch(`${serverUrl}/assignments/detect-meta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64: file.base64, mimeType: file.mime, fileName: file.name }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { grade: String(data?.grade || ''), curriculum: String(data?.curriculum || ''), chapter: String(data?.chapter || '') };
  } catch {
    return null;
  }
}
