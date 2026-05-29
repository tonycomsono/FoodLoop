// ===== Data =====
const STORAGE_KEY = 'foodloop_data_v1';
const seed = [
  { id: 1, nome: 'Tomate', qtd: 2.0, data: '2025-05-20', classe: 'Reaproveitável' },
  { id: 2, nome: 'Banana', qtd: 1.5, data: '2025-05-21', classe: 'Reaproveitável' },
  { id: 3, nome: 'Alface', qtd: 1.0, data: '2025-05-22', classe: 'Compostagem' },
  { id: 4, nome: 'Folhas e Cascas', qtd: 0.5, data: '2025-05-22', classe: 'Descarte final' },
];
let data = load();
function load(){
  try{ const s = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(s)&&s.length?s:seed.slice(); }
  catch{ return seed.slice(); }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

// ===== Navigation =====
const navBtns = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');
navBtns.forEach(b => b.addEventListener('click', () => {
  navBtns.forEach(x => x.classList.remove('active'));
  sections.forEach(s => s.classList.remove('active'));
  b.classList.add('active');
  document.getElementById(b.dataset.section).classList.add('active');
  renderAll();
}));

// ===== Form =====
document.getElementById('data').valueAsDate = new Date();
document.getElementById('form').addEventListener('submit', e => {
  e.preventDefault();
  const item = {
    id: Date.now(),
    nome: document.getElementById('nome').value.trim(),
    qtd: parseFloat(document.getElementById('qtd').value),
    data: document.getElementById('data').value,
    classe: document.getElementById('classe').value,
  };
  data.unshift(item);
  save();
  e.target.reset();
  document.getElementById('data').valueAsDate = new Date();
  document.querySelector('[data-section="historico"]').click();
});

// ===== Render =====
function totals(){
  const t = { total:0, 'Reaproveitável':0, 'Compostagem':0, 'Descarte final':0 };
  data.forEach(d => { t.total += d.qtd; t[d.classe] += d.qtd; });
  return t;
}
function fmt(n){ return n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2}); }

function renderKPIs(){
  const t = totals();
  document.getElementById('kpiTotal').textContent = fmt(t.total);
  document.getElementById('kpiReuse').textContent = fmt(t['Reaproveitável']);
  document.getElementById('kpiCompost').textContent = fmt(t['Compostagem']);
  document.getElementById('kpiDiscard').textContent = fmt(t['Descarte final']);
}
function badge(c){
  if(c==='Reaproveitável') return '<span class="badge badge-reuse">Reaproveitável</span>';
  if(c==='Compostagem') return '<span class="badge badge-compost">Compostagem</span>';
  return '<span class="badge badge-discard">Descarte final</span>';
}
function renderTable(){
  const tb = document.getElementById('tbody');
  tb.innerHTML = data.map(d => `
    <tr>
      <td>${escapeHtml(d.nome)}</td>
      <td>${fmt(d.qtd)} kg</td>
      <td>${new Date(d.data+'T00:00').toLocaleDateString('pt-BR')}</td>
      <td>${badge(d.classe)}</td>
      <td><button class="btn-del" data-id="${d.id}">Excluir</button></td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">Nenhum registro</td></tr>';
  tb.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', () => {
    data = data.filter(d => d.id !== +b.dataset.id);
    save(); renderAll();
  }));
}
function renderRecent(){
  const ul = document.getElementById('recentList');
  ul.innerHTML = data.slice(0,5).map(d => `
    <li><div><div class="name">${escapeHtml(d.nome)}</div><div class="meta">${new Date(d.data+'T00:00').toLocaleDateString('pt-BR')} · ${fmt(d.qtd)} kg</div></div>${badge(d.classe)}</li>
  `).join('') || '<li style="color:var(--muted);justify-content:center">Nenhum registro</li>';
}
function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ===== Charts (Canvas) =====
const COLORS = { 'Reaproveitável':'#7ed957', 'Compostagem':'#f5c842', 'Descarte final':'#d93b1e' };

function drawBars(canvas){
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W*dpr; canvas.height = H*dpr; ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);
  const t = totals();
  const cats = ['Reaproveitável','Compostagem','Descarte final'];
  const max = Math.max(...cats.map(c=>t[c]),1);
  const padL=50, padB=40, padT=20, padR=20;
  const cw = (W-padL-padR)/cats.length;
  const bw = cw*0.55;
  ctx.font = '500 12px Inter, sans-serif';
  // grid
  ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.fillStyle='#9ab184';
  for(let i=0;i<=4;i++){
    const y = padT + (H-padT-padB)*i/4;
    ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke();
    ctx.fillText(fmt(max*(1-i/4))+'kg', 6, y+4);
  }
  cats.forEach((c,i) => {
    const v = t[c];
    const h = (H-padT-padB)*(v/max);
    const x = padL + cw*i + (cw-bw)/2;
    const y = H-padB-h;
    const grad = ctx.createLinearGradient(0,y,0,H-padB);
    grad.addColorStop(0, COLORS[c]); grad.addColorStop(1, COLORS[c]+'55');
    ctx.fillStyle = grad;
    roundRect(ctx,x,y,bw,h,8); ctx.fill();
    ctx.fillStyle = '#f1f7ea'; ctx.textAlign='center';
    ctx.fillText(fmt(v)+'kg', x+bw/2, y-8);
    ctx.fillStyle = '#9ab184';
    ctx.fillText(c, x+bw/2, H-padB+18);
    ctx.textAlign='left';
  });
}
function roundRect(ctx,x,y,w,h,r){
  r = Math.min(r,h/2,w/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
function drawPie(canvas){
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W*dpr; canvas.height = H*dpr; ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);
  const t = totals();
  const cats = ['Reaproveitável','Compostagem','Descarte final'];
  const total = cats.reduce((a,c)=>a+t[c],0) || 1;
  const cx = W/2 - 60, cy = H/2, r = Math.min(W,H)/2 - 30;
  let a0 = -Math.PI/2;
  cats.forEach(c => {
    const slice = (t[c]/total)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,a0,a0+slice); ctx.closePath();
    ctx.fillStyle = COLORS[c]; ctx.fill();
    ctx.strokeStyle = '#1a2913'; ctx.lineWidth = 3; ctx.stroke();
    a0 += slice;
  });
  // donut hole
  ctx.beginPath(); ctx.arc(cx,cy,r*0.5,0,Math.PI*2); ctx.fillStyle='#1a2913'; ctx.fill();
  ctx.fillStyle='#f1f7ea'; ctx.font='800 22px Fraunces, serif'; ctx.textAlign='center';
  ctx.fillText(fmt(total)+'kg', cx, cy+2);
  ctx.font='500 11px Inter, sans-serif'; ctx.fillStyle='#9ab184';
  ctx.fillText('Total geral', cx, cy+20);
  // legend
  ctx.textAlign='left'; ctx.font='600 12px Inter, sans-serif';
  cats.forEach((c,i) => {
    const ly = cy - 30 + i*26;
    ctx.fillStyle = COLORS[c]; roundRect(ctx, W-130, ly-10, 14, 14, 4); ctx.fill();
    ctx.fillStyle = '#f1f7ea'; ctx.fillText(c, W-110, ly);
    ctx.fillStyle = '#9ab184'; ctx.font='500 11px Inter, sans-serif';
    ctx.fillText(fmt((t[c]/total)*100)+'%', W-110, ly+14);
    ctx.font='600 12px Inter, sans-serif';
  });
}

function renderCharts(){
  drawBars(document.getElementById('miniChart'));
  drawBars(document.getElementById('barChart'));
  drawPie(document.getElementById('pieChart'));
}

function renderAll(){ renderKPIs(); renderTable(); renderRecent(); renderCharts(); }
renderAll();
window.addEventListener('resize', renderCharts);
