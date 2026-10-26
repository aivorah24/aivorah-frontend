import SERVER_URL from '../../../../config/serverUrl';

const escAttr = (v: string) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Hosted (http/https) and inline (data:) pictures are used as-is; only legacy
// relative paths get the old server prefix (data: URIs used to get it too and broke).
export function previewImageSrc(url: string): string {
  return /^(https?:|data:|blob:)/i.test(url) ? url : SERVER_URL + url;
}

/** Generate a standalone interactive HTML quiz for browser preview — Aivorah Enchanted Forest dark theme */
export function generateQuizHTMLPreview(quiz: any): string {
  const totalQ = quiz.tasks?.reduce((s: number, t: any) => s + (t.questions?.length || 0), 0) || 0;
  const fmt = (t: string) => (t || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const tierColors: Record<string, { bg: string; border: string; label: string }> = {
    'MUST DO': { bg: 'rgba(186,164,103,0.08)', border: '#BAA467', label: '#BAA467' },
    'COULD DO': { bg: 'rgba(197,189,150,0.08)', border: '#C5BD96', label: '#C5BD96' },
    'ENRICHMENT': { bg: 'rgba(239,209,212,0.08)', border: '#EFD1D4', label: '#EFD1D4' },
  };
  const skipUnits = ['comparison', 'symbol', 'n/a', 'none', 'fraction', 'text', 'yes/no', 'explanation'];
  const answersMap: Record<string, any> = {};
  let qHTML = '', qIdx = 0;
  for (const task of (quiz.tasks || [])) {
    const c = tierColors[task.tier] || tierColors['MUST DO'];
    qHTML += `<div style="border-left:5px solid ${c.border};background:${c.bg};border-radius:12px;padding:20px 24px;margin:28px 0">
      <span style="display:inline-block;background:${c.border}20;color:${c.label};font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;padding:4px 12px;border-radius:4px;margin-bottom:6px">${task.tier}</span>
      <h2 style="font-size:18px;color:#F0EEEC;margin:6px 0 18px;font-weight:700">${fmt(task.title || '')}</h2>`;
    if (task.diagramHTML) {
      qHTML += `<div style="margin:0 0 20px;padding:16px;background:#252525;border-radius:10px;border:1px solid rgba(195,220,216,0.12);text-align:center">${task.diagramHTML}</div>`;
    }
    for (const q of (task.questions || [])) {
      qIdx++;
      const qId = `q${qIdx}`;
      const isFraction = typeof q.answer === 'string' && /^\d+\/\d+$/.test(q.answer);
      const isNum = !isFraction && (q.type === 'numeric' || typeof q.answer === 'number');
      answersMap[qId] = { answer: q.answer, isNum, range: q.acceptRange || null };
      const qLabel = q.id && /^[a-z0-9]/i.test(q.id) && q.id.length <= 3 ? `${q.id})` : `Q${qIdx}.`;
      const displayUnit = q.unit && !skipUnits.includes((q.unit || '').toLowerCase()) ? q.unit : '';
      const imgTag = q.imageUrl ? `<div style="margin-bottom:14px"><img class="wk-img" src="${escAttr(previewImageSrc(q.imageUrl))}" alt="${escAttr(q.diagramDescription || 'Worksheet diagram')}" onerror="wkImgError(this)"></div>` : '';
      qHTML += `<div style="background:#1C1C1C;padding:20px 24px;border-radius:10px;margin:14px 0;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:1px solid rgba(195,220,216,0.12)">
        <p style="font-size:15px;color:#F0EEEC;margin-bottom:14px;line-height:1.6"><strong style="color:#D9C9A0">${qLabel}</strong> ${fmt(q.question)}</p>
        ${imgTag}
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">
          <strong style="font-size:14px;color:#A8B5B3">Answer =</strong>
          <input type="text" id="${qId}-i" placeholder="?" style="width:130px;padding:10px 12px;border:2px solid rgba(195,220,216,0.25);border-radius:8px;font-size:16px;text-align:center;background:#252525;color:#F0EEEC">
          ${displayUnit ? `<span style="color:#A8B5B3;font-size:14px">${displayUnit}</span>` : ''}
          <button onclick="check('${qId}')" style="background:#BAA467;color:#0F0F0F;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px">Check</button>
          <button onclick="hint('${qId}')" style="background:#C5BD96;color:#0F0F0F;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px">Hint</button>
        </div>
        <div id="${qId}-h" style="display:none;margin-top:12px;padding:14px 16px;background:rgba(197,189,150,0.1);border-radius:8px;border-left:4px solid #C5BD96;color:#C5BD96;font-size:14px">${fmt(q.hint || '')}</div>
        <div id="${qId}-r" style="margin-top:8px;min-height:6px"></div>
        <div id="${qId}-s" style="display:none;margin-top:12px;padding:16px 18px;background:rgba(186,164,103,0.1);border-radius:8px;border-left:4px solid #BAA467;color:#BAA467;font-size:14px;line-height:1.7"><strong>Solution:</strong><br>${fmt((q.solution || '').replace(/Step (\d)/g, '<br>Step $1').replace(/Answer:/g, '<br><strong>Answer:</strong>'))}</div>
        <button id="${qId}-sb" onclick="sol('${qId}')" style="display:none;margin-top:10px;background:#BAA467;color:#0F0F0F;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px">Show Answer</button>
      </div>`;
    }
    qHTML += `</div>`;
  }
  let conceptsHTML = '';
  if (quiz.concepts?.length) {
    const cColors = ['#BAA467', '#C5BD96', '#D4A898', '#D9C9A0'];
    conceptsHTML = `<div style="display:flex;gap:16px;margin:24px 0;flex-wrap:wrap">` +
      quiz.concepts.map((cc: any, i: number) => `<div style="flex:1;min-width:220px;padding:20px;border-radius:12px;background:${cColors[i % cColors.length]}18;border:1px solid ${cColors[i % cColors.length]}40;color:#F0EEEC"><h3 style="font-size:18px;font-weight:800;margin-bottom:6px;color:${cColors[i % cColors.length]}">${cc.term}</h3><p style="font-size:13px;color:#A8B5B3;line-height:1.5">${cc.definition}</p>${cc.unit ? `<p style="margin-top:8px;font-size:12px;color:#5A6B69">Measured in<br><strong style="color:#D9C9A0">${cc.unit}</strong></p>` : ''}</div>`).join('') + `</div>`;
  }
  const answersJSON = JSON.stringify(answersMap).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${quiz.title || 'Quiz'} - Aivorah</title>
<script>function wkImgError(img){var n=document.createElement('div');n.className='wk-img-missing';n.textContent='Picture unavailable'+(img.alt?': '+img.alt:'');img.replaceWith(n);}</script>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0F0F0F;color:#F0EEEC;line-height:1.6}.hdr{background:linear-gradient(135deg,#1C1C1C 0%,#252525 100%);color:#F0EEEC;padding:28px 40px;position:relative;border-bottom:1px solid rgba(195,220,216,0.12)}.hdr-sub{font-size:13px;color:#5A6B69;margin-bottom:4px}.hdr h1{font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#D9C9A0}.hdr-meta{font-size:13px;color:#5A6B69;margin-top:4px}.ctr{max-width:960px;margin:0 auto;padding:0 24px 60px}.sc{position:fixed;top:20px;right:24px;width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,#BAA467,#8A7A3E);color:#0F0F0F;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(186,164,103,0.3);z-index:100}.sc-n{font-size:22px;font-weight:800;line-height:1}.sc-l{font-size:9px;text-transform:uppercase;letter-spacing:1px;opacity:0.7;margin-top:2px}.pw{padding:20px 0 4px}.pw-t{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#5A6B69;margin-bottom:8px}.pb{background:#252525;border-radius:6px;height:12px;overflow:hidden;border:1px solid rgba(195,220,216,0.08)}.pf{background:linear-gradient(90deg,#BAA467,#D9C9A0);height:100%;border-radius:6px;transition:width .6s ease}.wk-img{display:block;width:auto;height:auto;max-width:100%;max-height:420px;object-fit:contain;margin:0 auto;background:#fff;padding:8px;border-radius:8px;border:1px solid rgba(195,220,216,0.12)}.wk-img-missing{font-size:12px;color:#A8B5B3;padding:8px 12px;border:1px dashed rgba(195,220,216,0.25);border-radius:8px}.pp{text-align:right;font-size:12px;color:#BAA467;font-weight:600;margin-top:4px}input:focus{outline:none;border-color:#BAA467!important;box-shadow:0 0 0 3px rgba(186,164,103,0.2)}button:hover{opacity:0.85;transform:translateY(-1px)}@media(max-width:640px){.hdr{padding:20px}.hdr h1{font-size:20px}.ctr{padding:0 14px 40px}.sc{width:60px;height:60px;top:14px;right:14px}.sc-n{font-size:18px}}</style></head>
<body><div class="hdr"><div class="hdr-sub">${quiz.school || 'Aivorah'} &middot; ${quiz.grade || ''}</div><h1>${fmt(quiz.title || 'Interactive Quiz')}</h1><div class="hdr-meta">Subject: ${quiz.subject || 'Mathematics'} &nbsp;|&nbsp; Powered by Aivorah</div></div>
<div class="sc"><span class="sc-n" id="sn">0/${totalQ}</span><span class="sc-l">Score</span></div><div class="ctr"><div class="pw"><div class="pw-t">Quiz Progress</div><div class="pb"><div class="pf" id="pf" style="width:0%"></div></div><div class="pp" id="pp">0% complete</div></div>${conceptsHTML}${qHTML}</div>
<script>let sc=0;const tot=${totalQ};const dn=new Set();const ans=${answersJSON};
function up(){document.getElementById('sn').textContent=sc+'/'+tot;const p=Math.round(dn.size/tot*100);document.getElementById('pf').style.width=p+'%';document.getElementById('pp').textContent=p+'% complete'}
function check(id){const a=ans[id];if(!a)return;const inp=document.getElementById(id+'-i');const val=inp.value.trim();if(!val){inp.style.borderColor='#C5BD96';return}const r=document.getElementById(id+'-r');let ok=false;if(a.isNum){const v=parseFloat(val);if(isNaN(v)){inp.style.borderColor='#C5BD96';return}ok=a.range?(v>=a.range[0]&&v<=a.range[1]):Math.abs(v-a.answer)<0.01}else{ok=val.replace(/\\s+/g,'').toLowerCase()===String(a.answer).replace(/\\s+/g,'').toLowerCase()}if(ok){r.innerHTML='<span style="color:#BAA467;font-weight:700">&#10004; Correct!</span>';inp.style.borderColor='#BAA467';inp.style.background='rgba(186,164,103,0.1)';if(!dn.has(id)){sc++;dn.add(id)}document.getElementById(id+'-s').style.display='block'}else{r.innerHTML='<span style="color:#EFD1D4;font-weight:700">Not quite. Try again!</span>';inp.style.borderColor='#EFD1D4';document.getElementById(id+'-sb').style.display='inline-block'}up()}
function hint(id){const e=document.getElementById(id+'-h');e.style.display=e.style.display==='none'?'block':'none'}
function sol(id){const e=document.getElementById(id+'-s');e.style.display=e.style.display==='none'?'block':'none'}</script></body></html>`;
}

function getAnsweredQuizHtmlImpl(originalHtml: string, submission: any) {
  if (!originalHtml) return '';
  // Interactive-quiz completions (PUT /assignments/:id/complete) store answers
  // under submission_text as { perQuestion: [{qId, answer, correct, ...}] } —
  // there is no separate top-level "answers" map. submission.studentAnswers is
  // always empty for this submission type, so building the qId→answer lookup
  // from it (as before) meant the injected script's loop never ran and the
  // "answered sheet" preview always rendered blank.
  const pq = Array.isArray(submission.perQuestion) ? submission.perQuestion : [];
  const answersMap: Record<string, any> = {};
  for (const q of pq) {
    if (q && q.qId != null) answersMap[q.qId] = q.answer;
  }
  const answersJson = JSON.stringify(answersMap);
  const perQuestionJson = JSON.stringify(pq);
  const scriptToInject = `
    <script>
      window.addEventListener('load', function() {
        const answers = ${answersJson};
        const pq = ${perQuestionJson};
        for (const [qId, ans] of Object.entries(answers)) {
          const inputEl = document.getElementById(qId + '-input') || document.getElementById(qId);
          if (inputEl) {
            inputEl.value = ans;
            inputEl.disabled = true;
            const qInfo = pq.find(x => x.qId === qId);
            if (qInfo) {
              const correct = qInfo.correct ?? (qInfo.score >= 70);
              inputEl.style.borderColor = correct ? '#8bc34a' : '#e57373';
              inputEl.style.backgroundColor = correct ? 'rgba(139,195,74,0.1)' : 'rgba(229,115,115,0.1)';
            }
            continue;
          }
          const radios = document.getElementsByName(qId);
          if (radios.length > 0) {
            for (const radio of radios) {
              if (radio.value === ans) radio.checked = true;
              radio.disabled = true;
            }
            continue;
          }
          // Venn diagrams have no single "-input" element — 3 separate textareas
          // (qId-left/-center/-right), and the stored answer is one combined
          // string like "left: a, b | center: c | right: d" (checkVenn's own
          // snapshot format). Split it back out per region.
          const leftEl = document.getElementById(qId + '-left');
          if (leftEl && typeof ans === 'string') {
            const parts = ans.split('|').map(function(s) { return s.trim(); });
            parts.forEach(function(part) {
              const m = part.match(/^(left|center|right):\\s*(.*)$/i);
              if (!m) return;
              const el = document.getElementById(qId + '-' + m[1].toLowerCase());
              if (el) { el.value = m[2]; el.disabled = true; }
            });
          }
        }
        document.querySelectorAll('button').forEach(btn => btn.disabled = true);

        // The score badge and progress bar are normally only updated by the
        // in-page up() function, which this review script never calls (it sets
        // input values directly, bypassing the check pipeline) — so they stayed
        // frozen at their initial "0/total, 0%" state even though the answers
        // below were correctly populated. Set them directly from the real
        // completed submission instead.
        const totalQ = pq.length;
        const correctQ = pq.filter(function(x) { return x.correct === true; }).length;
        const scoreEl = document.getElementById('score-num');
        if (scoreEl && totalQ > 0) scoreEl.textContent = correctQ + '/' + totalQ;
        const pf = document.getElementById('pf');
        if (pf) pf.style.width = '100%';
        const pp = document.getElementById('pp');
        if (pp) pp.textContent = '100% complete';
      });
    </script>
  `;
  return originalHtml.replace('</body>', scriptToInject + '</body>');
}

export const getAnsweredQuizHtml = getAnsweredQuizHtmlImpl;

/** Strip every internal `_`-prefixed field (e.g. `_previewHTML`, `_editMode`,
 * `_normalized`, `_sourceDocKey`) from a quiz object before persisting it —
 * these are UI-only bookkeeping fields, never meant to reach the server. */
export function stripInternalQuizFields(quiz: any): any {
  const clean: any = {};
  for (const k of Object.keys(quiz)) {
    if (!k.startsWith('_')) clean[k] = quiz[k];
  }
  return clean;
}
