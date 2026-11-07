/* Relatório das edições da Supercopa AFC — revista A4 paisagem (modelo: relatório anual de atividades do ICM). */
(function () {
'use strict';
var API = 'https://hngwasixgyvnvfanpuax.supabase.co/functions/v1/api';
var SITE = 'https://www.supercopaafc.com.br/';
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
var N = function (n) { return Math.round(+n || 0).toLocaleString('pt-BR'); };
var R = function (n) { return 'R$ ' + N(n); };
var C = function (n) { return n >= 1e6 ? (n / 1e6).toFixed(2).replace('.', ',') + ' mi' : n >= 1e3 ? N(n / 1e3) + ' mil' : N(n); };
var FOTO = function (n) { return SITE + 'galeria/f-' + String(n).padStart(2, '0') + '.webp'; };
var get = function (a, p) { var q = new URLSearchParams(Object.assign({ action: a }, p || {})); return fetch(API + '?' + q, { cache: 'no-store' }).then(function (r) { return r.json(); }); };
var safe = function (p) { return p.catch(function () { return null; }); };

/* ---------- dados das edições (informados pela organização) ---------- */
var ANOS = [2021, 2022, 2023, 2024, 2025, 2026];
var TIMES = [6, 12, 12, 12, 12, 18];
var PESS = 16;
var ALCANCE = [5000, 150000, 340000, 580000, 880000];
var KM = { 'Afonso Cláudio': 0, 'Castelo': 90, 'Cachoeiro de Itapemirim': 125, 'Venda Nova do Imigrante': 50, 'Santa Maria de Jetibá': 80, 'Vitória': 125, 'Vila Velha': 135, 'Serra': 115, 'Itabaiana': 150, 'Itaperuna': 330, 'Atílio Vivácqua': 150, 'Manhuaçu': 180, 'Baixo Guandu': 160, 'Aracruz': 170, 'Colatina': 130, 'São Paulo': 950 };
var C23 = ['Vitória', 'Serra', 'Vila Velha', 'Itabaiana', 'Itaperuna', 'Cachoeiro de Itapemirim', 'Atílio Vivácqua'];
var CID = { 2021: ['Afonso Cláudio', 'Castelo', 'Cachoeiro de Itapemirim', 'Venda Nova do Imigrante', 'Santa Maria de Jetibá'], 2022: ['Vitória', 'Vila Velha', 'Cachoeiro de Itapemirim', 'Venda Nova do Imigrante'], 2023: C23, 2024: C23.concat(['Manhuaçu']), 2025: C23.concat(['Manhuaçu']), 2026: ['Baixo Guandu', 'Afonso Cláudio', 'Aracruz', 'Colatina', 'Itaperuna', 'Vitória', 'Serra', 'Cachoeiro de Itapemirim', 'São Paulo'] };
var CAMP = [['2021', 'Vôlei VNI', 'Venda Nova do Imigrante/ES', 'Vôlei'], ['2022', 'RPB Vôlei', 'Cachoeiro de Itapemirim/ES', 'Vôlei'], ['2023', 'Equipe UVI', 'Itaperuna/RJ', 'Vôlei'], ['2024', 'Liverpool Vôlei', 'Grande Vitória/ES', 'Vôlei'], ['2025', 'ES Vôlei', 'Grande Vitória/ES', 'Vôlei'], ['2026', 'São Pedro', 'Espírito Santo', 'Basquete · 1ª edição']];
var PREM = { alim: 85, hosp: 90, noites: 1, gas: 6.3, kml: 10, carros: 4, dias: 2 };
var PARC = [['Realização', 'l', [['prefeitura-afonso-claudio', 'Prefeitura de Afonso Cláudio']]], ['Patrocinador Master', 'l', [['coroa-instituto', 'Coroa Instituto']]], ['Patrocinadores Prata', '', [['planet-sports', 'Planet Sports'], ['acai-do-diego', 'Açaí do Diego'], ['casa-homem-do-campo', 'Casa Homem do Campo'], ['sicredi', 'Sicredi'], ['express-pizzas-e-lanches', 'Express Pizzas e Lanches'], ['izi-internet', 'IZI Internet']]], ['Patrocinador Bronze', '', [['prato-fino', 'Prato Fino'], ['restaurante-do-marcao', 'Restaurante do Marcão'], ['elite-suplementos', 'Elite Suplementos'], ['jacare-fotografia', 'Jacaré Fotografia'], ['laboratorio-cda', 'Laboratório CDA']]], ['Apoio', '', [['basquetebol-das-montanhas', 'Basquetebol das Montanhas'], ['instituto-cultural-das-montanhas', 'Instituto Cultural das Montanhas']]]];
var NOMEPARC = {}; PARC.forEach(function (g) { g[2].forEach(function (x) { NOMEPARC[x[0]] = x[1]; }); });

function economia(p) {
  return ANOS.map(function (a, i) {
    var t = TIMES[i], cs = CID[a].filter(function (c) { return c !== 'Afonso Cláudio'; }), dist = cs.length ? cs.reduce(function (s, c) { return s + (KM[c] || 150); }, 0) / cs.length : 0,
      alim = PESS * p.alim * p.dias, hosp = PESS * p.hosp * p.noites, comb = p.carros * (2 * dist / p.kml) * p.gas, vis = Math.max(0, t - 1);
    return { a: a, t: t, dist: dist, alim: alim, hosp: hosp, comb: comb, visita: alim + hosp + comb, total: t * alim + vis * (hosp + comb), alimT: t * alim, hospT: vis * hosp, combT: vis * comb };
  });
}

/* ---------- gráficos em SVG (unidades em mm, viewBox 100 x H) ---------- */
function bars(d, o) {
  o = o || {}; var W = 100, H = o.h || 52, pt = 8, pb = 8, mx = Math.max.apply(null, d.map(function (x) { return x.v; }).concat([1])) * 1.12, bw = W / d.length, s = '<svg class="rv-chart" viewBox="0 0 ' + W + ' ' + H + '">';
  for (var i = 0; i <= 3; i++) { var y = pt + (H - pt - pb) * i / 3; s += '<line class="g" x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '"/>'; }
  d.forEach(function (x, i) { var h = (H - pt - pb) * x.v / mx, x0 = i * bw + bw * .17, w = bw * .66, y = H - pb - h; s += '<rect class="b' + (x.hi ? ' hi' : '') + '" x="' + x0 + '" y="' + y + '" width="' + w + '" height="' + h + '" rx=".6"/><text class="v" x="' + (x0 + w / 2) + '" y="' + (y - 1.6) + '" text-anchor="middle">' + (o.fmt ? o.fmt(x.v) : N(x.v)) + '</text><text x="' + (x0 + w / 2) + '" y="' + (H - 2.2) + '" text-anchor="middle">' + esc(x.l) + '</text>'; });
  return s + '</svg>';
}
function line(d, o) {
  o = o || {}; var W = 100, H = o.h || 52, pl = 4, pr = 4, pt = 9, pb = 8, mx = Math.max.apply(null, d.map(function (x) { return x.v; }).concat([1])) * 1.15, st = (W - pl - pr) / (d.length - 1 || 1);
  var P = d.map(function (x, i) { return [pl + i * st, H - pb - (H - pt - pb) * x.v / mx]; }), s = '<svg class="rv-chart" viewBox="0 0 ' + W + ' ' + H + '">';
  for (var i = 0; i <= 3; i++) { var y = pt + (H - pt - pb) * i / 3; s += '<line class="g" x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '"/>'; }
  var path = P.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('');
  s += '<path class="ar" d="' + path + 'L' + P[P.length - 1][0] + ' ' + (H - pb) + 'L' + P[0][0] + ' ' + (H - pb) + 'Z"/><path class="ln" d="' + path + '"/>';
  d.forEach(function (x, i) { s += '<circle class="dot" cx="' + P[i][0] + '" cy="' + P[i][1] + '" r="1.3"/><text class="v" x="' + P[i][0] + '" y="' + (P[i][1] - 3) + '" text-anchor="middle">' + (o.fmt ? o.fmt(x.v) : N(x.v)) + '</text><text x="' + P[i][0] + '" y="' + (H - 2.2) + '" text-anchor="middle">' + esc(x.l) + '</text>'; });
  return s + '</svg>';
}
function stack(d, cores) {
  var W = 100, H = 52, pt = 6, pb = 8, mx = Math.max.apply(null, d.map(function (x) { return x.p.reduce(function (s, v) { return s + v; }, 0); }).concat([1])) * 1.1, bw = W / d.length, s = '<svg class="rv-chart" viewBox="0 0 ' + W + ' ' + H + '">';
  for (var i = 0; i <= 3; i++) { var y = pt + (H - pt - pb) * i / 3; s += '<line class="g" x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '"/>'; }
  d.forEach(function (x, i) { var yb = H - pb, x0 = i * bw + bw * .17, w = bw * .66; x.p.forEach(function (v, k) { var h = (H - pt - pb) * v / mx; yb -= h; s += '<rect x="' + x0 + '" y="' + yb + '" width="' + w + '" height="' + h + '" fill="' + cores[k] + '"/>'; }); s += '<text class="v" x="' + (x0 + w / 2) + '" y="' + (yb - 1.6) + '" text-anchor="middle">' + C(x.p.reduce(function (a, b) { return a + b; }, 0)) + '</text><text x="' + (x0 + w / 2) + '" y="' + (H - 2.2) + '" text-anchor="middle">' + esc(x.l) + '</text>'; });
  return s + '</svg>';
}
function donut(parts, tam, centro) {
  var tot = parts.reduce(function (s, p) { return s + p.v; }, 0) || 1, R_ = 40, Cc = 2 * Math.PI * R_, off = 0, s = '<svg viewBox="0 0 100 100" style="width:' + tam + 'mm;height:' + tam + 'mm;flex:none"><circle cx="50" cy="50" r="' + R_ + '" fill="none" stroke="rgba(120,130,170,.18)" stroke-width="16"/>';
  parts.forEach(function (p) { var len = Cc * p.v / tot; s += '<circle cx="50" cy="50" r="' + R_ + '" fill="none" stroke="' + p.cor + '" stroke-width="16" stroke-dasharray="' + len.toFixed(1) + ' ' + (Cc - len).toFixed(1) + '" stroke-dashoffset="' + (-off).toFixed(1) + '" transform="rotate(-90 50 50)"/>'; off += len; });
  return s + (centro ? '<text x="50" y="55" text-anchor="middle" style="font:800 15px Barlow Condensed;fill:currentColor">' + centro + '</text>' : '') + '</svg>';
}
function barrasH(d, fmt) { var mx = Math.max.apply(null, d.map(function (x) { return x.v; }).concat([1])); return '<div class="rv-barras">' + d.map(function (x) { return '<div class="b"><span>' + esc(x.l) + '</span><i style="width:' + (x.v / mx * 100).toFixed(1) + '%"></i><b>' + (fmt ? fmt(x.v) : N(x.v)) + '</b></div>'; }).join('') + '</div>'; }
var arco = function () { return [].slice.call(arguments).map(function (a) { return '<div class="rv-arc" style="left:' + a[0] + 'mm;top:' + a[1] + 'mm;width:' + a[2] + 'mm;height:' + a[2] + 'mm"></div>'; }).join(''); };
var foto = function (n, estilo, cap) { return '<figure class="rv-ph" style="' + (estilo || '') + '"><img src="' + FOTO(n) + '" alt="">' + (cap ? '<figcaption>' + esc(cap) + '</figcaption>' : '') + '</figure>'; };
var fotoSite = function (nome, estilo) { return '<figure class="rv-ph" style="' + (estilo || '') + '"><img src="' + SITE + 'novo/fotos/' + nome + '.webp" alt=""></figure>'; };

/* ---------- montagem ---------- */
function montar(D) {
  var P = [], eco = economia(PREM), tot = {};
  tot.times = TIMES.reduce(function (a, b) { return a + b; }, 0); tot.atl = tot.times * PESS;
  var uniq = {}; ANOS.forEach(function (a) { CID[a].forEach(function (c) { uniq[c] = 1; }); }); tot.cid = Object.keys(uniq).length;
  tot.alc = ALCANCE.reduce(function (a, b) { return a + b; }, 0); tot.eco = eco.reduce(function (s, x) { return s + x.total; }, 0);
  var add = function (o) { P.push(o); };
  var hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  var A = D.acc || {}, tem = function (n, min) { return n != null && n >= (min || 1); };

  add({ tipo: 'capa', html: function () { return '<div class="orb" style="width:130mm;height:130mm;left:-40mm;top:-55mm"></div><div class="orb" style="width:22mm;height:22mm;left:44mm;top:24mm"></div>' + fotoSite('inicio') + '<div class="tit"><div class="k">Supercopa AFC · Afonso Cláudio / ES</div><div class="a">Relatório<br>das Edições</div><div class="b">2021–2026</div></div><div class="marca"><img src="' + SITE + 'novo/logo-branco.png" alt="Supercopa AFC"></div>'; } });
  var ind = { tipo: 'std', sec: '', html: function () { return ''; } }; add(ind);

  /* A Supercopa */
  var S1 = 'A Supercopa';
  add({ tipo: 'div', sec: S1, html: function () { return fotoSite('historia') + '<div class="t">' + S1 + '</div><div class="s">Seis edições de esporte, integração e crescimento</div>'; } });
  add({ sec: S1, titulo: 'Quem somos', html: function () { return '<div class="rv-blob" style="width:200mm;height:260mm;left:-110mm;top:-30mm"></div>' + foto(10, 'position:absolute;left:12mm;top:22mm;width:92mm;height:170mm;border-radius:46mm 46mm 6mm 6mm') + '<div style="position:absolute;left:116mm;right:18mm;top:20mm"><h1 class="rv-h">Quem somos</h1><p class="rv-lead">Do primeiro jogo ao maior campeonato multiesporte da Região das Montanhas.</p><div class="rv-col"><p>A Supercopa de Afonso Cláudio é o principal campeonato multiesporte da cidade, realizado anualmente desde 2021. Nasceu da vontade de reunir a comunidade em torno do esporte, promovendo competição, integração e valorização dos atletas locais.</p><p>Começou no vôlei, com ' + TIMES[0] + ' equipes, e dobrou de tamanho já na segunda edição. Em 2026 o torneio ganha o basquete e chega a <b>' + TIMES[5] + ' equipes</b>: 12 no vôlei e 6 no basquete.</p><p>Cada equipe inscreve ' + PESS + ' pessoas entre atletas e comissão técnica. A cada edição o campeonato recebe times de mais cidades do Espírito Santo e de estados vizinhos, movimenta o comércio local e leva o nome de Afonso Cláudio para milhares de pessoas nas redes sociais.</p></div></div>'; } });
  add({ sec: S1, titulo: 'Linha do tempo', html: function () {
    var it = [['2021 · 1ª edição', 'A Supercopa nasce em Afonso Cláudio, reunindo ' + TIMES[0] + ' times da cidade e da região pela primeira vez. Campeão: Vôlei VNI.'], ['2022 · 2ª edição', 'O número de equipes dobra para ' + TIMES[1] + '. Times da Grande Vitória passam a disputar o título. Campeão: RPB Vôlei.'], ['2023 · 3ª edição', 'Chegam equipes de Itaperuna (RJ) e de mais cidades capixabas. Campeão: Equipe UVI.'], ['2024 · 4ª edição', 'Manhuaçu (MG) entra no mapa e a estrutura do evento cresce. Campeão: Liverpool Vôlei.'], ['2025 · 5ª edição', 'Edição comemorativa e a primeira com premiação em dinheiro: R$ 1.000 ao campeão e R$ 500 ao vice. Campeão: ES Vôlei.'], ['2026 · 6ª edição', 'Pela primeira vez, vôlei e basquete juntos, com ' + TIMES[5] + ' equipes. O basquete estreou em julho com São Pedro campeão; o vôlei decide o título em 28 e 29 de novembro.']];
    return arco([190, -50, 160]) + '<div class="rv-in"><h1 class="rv-h">Linha do tempo</h1><div class="rv-tl" style="width:230mm;margin-top:6mm">' + it.map(function (x) { return '<div class="it"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div></div>' + foto(21, 'position:absolute;right:0;top:0;bottom:0;width:48mm;border-radius:0'); } });

  /* Números */
  var S2 = 'As edições em números';
  add({ tipo: 'div', sec: S2, cor: '#0b2a8f', cor2: '#22c3ee', html: function () { return fotoSite('jogos') + '<div class="t">' + S2 + '</div><div class="s">Crescimento, abrangência e alcance</div>'; } });
  add({ tipo: 'cor', sec: S2, titulo: 'Transformação em números', html: function () {
    return '<div class="rv-in"><h1 class="rv-h">Transformação em números</h1><p style="width:200mm">De ' + TIMES[0] + ' equipes em 2021 para ' + TIMES[5] + ' em 2026. Os números abaixo somam as seis edições do campeonato.</p><div class="rv-cols-4" style="margin-top:6mm">' +
      [[tot.times, 'participações de equipes', 'somando todas as edições'], [N(tot.atl), 'vagas de atletas e comissão', PESS + ' pessoas por equipe'], [tot.cid, 'cidades representadas', 'ES, RJ, MG e SP'], [C(tot.alc), 'visualizações no Instagram', 'de 2021 a 2025']].map(function (k) { return '<div class="rv-kpi"><div class="n">' + k[0] + '</div><div class="l">' + k[1] + '</div><p>' + k[2] + '</p></div>'; }).join('') + '</div>' +
      '<div class="rv-cols" style="margin-top:9mm"><div><div class="rv-h2">Equipes por edição</div>' + bars(ANOS.map(function (a, i) { return { l: a, v: TIMES[i], hi: i === 5 }; }), { h: 54 }) + '</div><div><div class="rv-h2">Pessoas inscritas por edição</div>' + line(ANOS.map(function (a, i) { return { l: a, v: TIMES[i] * PESS }; }), { h: 54 }) + '</div></div></div><div class="rv-nota">Cada equipe inscreve 16 pessoas. Em 2026 os números incluem vôlei (12 equipes) e basquete (6 equipes).</div>'; } });
  add({ sec: S2, titulo: 'Crescimento das equipes', html: function () {
    var x3 = (TIMES[5] * PESS) / (TIMES[0] * PESS);
    return arco([-30, 120, 150]) + '<div class="rv-in"><h1 class="rv-h">Crescimento sem parar</h1><div style="display:grid;grid-template-columns:1fr 92mm;gap:12mm"><div><p class="rv-lead">Em seis anos, o campeonato triplicou de tamanho.</p><p>Foram <b>' + TIMES[0] + ' equipes</b> na primeira edição e <b>' + TIMES[5] + '</b> na sexta. Em 2022 o torneio dobrou para ' + TIMES[1] + ' equipes e se manteve nesse patamar até 2025, consolidando a estrutura. Em 2026, com a chegada do basquete, o número de pessoas inscritas chega a <b>' + N(TIMES[5] * PESS) + '</b>, ' + x3.toFixed(0) + ' vezes mais que em 2021.</p>' +
      '<div class="rv-cols" style="margin-top:6mm"><div class="rv-kpi"><div class="n">' + x3.toFixed(0) + '×</div><div class="l">mais pessoas em quadra</div><p>' + (TIMES[0] * PESS) + ' em 2021 · ' + (TIMES[5] * PESS) + ' em 2026</p></div><div class="rv-kpi"><div class="n">+' + Math.round((TIMES[5] / TIMES[4] - 1) * 100) + '%</div><div class="l">de 2025 para 2026</div><p>' + TIMES[4] + ' para ' + TIMES[5] + ' equipes com a estreia do basquete</p></div></div></div>' +
      '<div class="rv-card"><div class="rv-h2">Equipes por edição</div>' + barrasH(ANOS.map(function (a, i) { return { l: String(a), v: TIMES[i] }; })) + '</div></div></div>' + foto(14, 'position:absolute;left:16mm;bottom:12mm;width:120mm;height:50mm'); } });
  add({ sec: S2, titulo: 'Abrangência', html: function () {
    return '<div class="rv-in"><h1 class="rv-h">Cidades que já vieram</h1><div style="display:grid;grid-template-columns:105mm 1fr;gap:12mm"><div><p>O campeonato cresce também no mapa: foram <b>' + tot.cid + ' cidades</b> com equipes ao longo das seis edições, do interior do Espírito Santo à Grande Vitória, e ainda Itaperuna (RJ), Manhuaçu (MG) e São Paulo (SP) em 2026.</p><div class="rv-h2" style="margin-top:4mm">Cidades por edição</div>' + bars(ANOS.map(function (a, i) { return { l: a, v: CID[a].length, hi: i === 5 }; }), { h: 50 }) + '</div><div>' +
      ANOS.slice().reverse().map(function (a) { return '<div style="margin-bottom:4mm"><div class="rv-h2" style="margin-bottom:1mm">' + a + '</div><div class="rv-chips">' + CID[a].map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div></div>'; }).join('') + '</div></div></div>'; } });
  add({ sec: S2, titulo: 'Campeões', html: function () {
    return '<div class="rv-blob" style="width:330mm;height:330mm;left:-10mm;top:-60mm;opacity:.7"></div><div class="rv-in"><h1 class="rv-h">Hall da fama</h1><p style="width:200mm">Seis edições, seis campeões. Cada nome abaixo entrou para a história da Supercopa.</p><div class="rv-champ" style="margin-top:6mm">' + CAMP.map(function (c) { return '<div class="c"><div class="y">' + c[0] + '</div><div class="t">' + esc(c[1]) + '</div><div class="d">' + esc(c[2]) + '<br>' + esc(c[3]) + '</div></div>'; }).join('') + '</div></div><div class="rv-nota">O título do vôlei de 2026 será decidido em 28 e 29 de novembro, em Afonso Cláudio.</div>'; } });

  /* Alcance e audiência */
  var S3 = 'Alcance e audiência';
  add({ tipo: 'div', sec: S3, cor: '#7c3aed', cor2: '#22c3ee', html: function () { return fotoSite('galeria') + '<div class="t">' + S3 + '</div><div class="s">Instagram, site e aplicativo</div>'; } });
  add({ sec: S3, titulo: 'Instagram', cor: '#7c3aed', html: function () {
    return arco([200, -60, 160]) + '<div class="rv-in"><h1 class="rv-h">Instagram: alcance que explode</h1><div style="display:grid;grid-template-columns:1fr 94mm;gap:12mm"><div><p class="rv-lead">De 5 mil para 880 mil visualizações em quatro anos.</p><div class="rv-h2">Visualizações da página por edição</div>' + bars(ALCANCE.map(function (v, i) { return { l: ANOS[i], v: v, hi: i === 4 }; }), { fmt: C, h: 56 }) + '</div><div><div class="rv-kpi"><div class="n">' + C(tot.alc) + '</div><div class="l">visualizações acumuladas</div><p>soma de 2021 a 2025</p></div><div class="rv-kpi" style="margin-top:4mm"><div class="n">' + N(ALCANCE[4] / ALCANCE[0]) + '×</div><div class="l">crescimento 2021 → 2025</div><p>' + C(ALCANCE[0]) + ' em 2021 · ' + C(ALCANCE[4]) + ' em 2025</p></div><div class="rv-kpi" style="margin-top:4mm"><div class="n">+' + Math.round((ALCANCE[4] / ALCANCE[3] - 1) * 100) + '%</div><div class="l">de 2024 para 2025</div><p>' + C(ALCANCE[3]) + ' para ' + C(ALCANCE[4]) + '</p></div></div></div></div><div class="rv-nota">Números de alcance informados pela organização a partir das estatísticas do perfil oficial no Instagram. 2026 em andamento.</div>'; } });
  add({ tipo: 'cor', sec: S3, titulo: 'Site e aplicativo', cor: '#1b52e0', html: function () {
    var meses = D.meses && D.meses.length ? D.meses : null;
    var kp = [];
    if (tem(A.siteTotal)) kp.push([N(A.siteTotal), 'acessos ao site', 'cada visita conta 1']);
    if (tem(A.appTotal)) kp.push([N(A.appTotal), 'acessos ao app', 'cada abertura conta 1']);
    if (tem(A.siteTotal) || tem(A.appTotal)) kp.push([N((A.siteTotal || 0) + (A.appTotal || 0)), 'acessos no total', 'site e app somados']);
    if (tem(A.instal, 10)) kp.push([N(A.instal), 'instalações do app', 'no celular dos atletas e do público']);
    if (tem(A.quiz, 10)) kp.push([N(A.quiz), 'participantes do quiz', 'respostas registradas']);
    return '<div class="rv-in"><h1 class="rv-h">Site e aplicativo</h1><p style="width:215mm">A Supercopa tem site oficial e aplicativo próprios, com jogos, classificação, transmissão e atleta destaque. Cada vez que alguém abre o site ou o app, o acesso é registrado, mesmo que seja a mesma pessoa voltando várias vezes.</p>' +
      '<div class="rv-cols-4" style="margin-top:6mm">' + (kp.length ? kp.slice(0, 4).map(function (k) { return '<div class="rv-kpi"><div class="n">' + k[0] + '</div><div class="l">' + k[1] + '</div><p>' + k[2] + '</p></div>'; }).join('') : '<div class="rv-kpi" style="grid-column:1/-1"><div class="l">Os acessos começam a ser somados aqui assim que o sistema registrar o primeiro mês completo.</div></div>') + '</div>' +
      (meses ? '<div class="rv-cols" style="margin-top:8mm"><div><div class="rv-h2">Acessos por mês</div>' + stack(meses.map(function (m) { return { l: m.l, p: [m.a, m.b] }; }), ['rgba(255,255,255,.55)', '#ffffff']) + '<div class="rv-small" style="margin-top:1mm">Site (claro) e app (branco)</div></div><div class="rv-donut" style="justify-content:center;gap:10mm">' + donut([{ v: A.siteTotal || 0, cor: 'rgba(255,255,255,.55)' }, { v: A.appTotal || 0, cor: '#ffffff' }], 52, C((A.siteTotal || 0) + (A.appTotal || 0))) + '<div class="rv-leg"><div><i style="background:rgba(255,255,255,.55)"></i>Site · ' + N(A.siteTotal || 0) + '</div><div><i style="background:#fff"></i>App · ' + N(A.appTotal || 0) + '</div></div></div></div>' : '') + '</div><div class="rv-nota">Dados registrados pelo sistema da Supercopa no momento da geração deste relatório (' + hoje + ').</div>'; } });

  if (D.pat && D.pat.total > 0) add({ sec: S3, titulo: 'Visibilidade dos patrocinadores', cor: '#0ea5e9', html: function () {
    var pp = D.pat.porPatrocinador.slice(0, 12).map(function (x) { return { l: NOMEPARC[x.patrocinador] || x.patrocinador, v: +x.n }; });
    var plat = {}; (D.pat.porPlataforma || []).forEach(function (x) { plat[x.plataforma] = +x.n; });
    return arco([190, 100, 170]) + '<div class="rv-in"><h1 class="rv-h">Visibilidade dos patrocinadores</h1><div style="display:grid;grid-template-columns:1fr 92mm;gap:12mm"><div><p class="rv-lead">Cada vez que um logo aparece na tela de alguém, conta 1 exibição.</p><div class="rv-h2">Exibições por patrocinador</div>' + barrasH(pp) + '</div><div><div class="rv-kpi"><div class="n">' + N(D.pat.total) + '</div><div class="l">exibições de logos</div><p>desde ' + (D.pat.desde ? new Date(D.pat.desde + 'T12:00').toLocaleDateString('pt-BR') : '—') + '</p></div><div class="rv-donut" style="margin-top:6mm">' + donut([{ v: plat.site || 0, cor: '#1b52e0' }, { v: plat.app || 0, cor: '#22c3ee' }], 36) + '<div class="rv-leg"><div><i style="background:#1b52e0"></i>Site · ' + N(plat.site || 0) + '</div><div><i style="background:#22c3ee"></i>App · ' + N(plat.app || 0) + '</div></div></div></div></div></div>'; } });

  /* Impacto */
  var S4 = 'Impacto na cidade';
  add({ tipo: 'div', sec: S4, cor: '#047857', cor2: '#22c3ee', html: function () { return fotoSite('times') + '<div class="t">' + S4 + '</div><div class="s">Economia local e valorização dos atletas</div>'; } });
  add({ sec: S4, titulo: 'Impacto econômico', cor: '#047857', html: function () {
    var u = eco[5];
    return arco([200, -40, 150]) + '<div class="rv-in"><h1 class="rv-h">Dinheiro que circula na cidade</h1><div style="display:grid;grid-template-columns:1fr 100mm;gap:12mm"><div><p class="rv-lead">Estimativa de ' + R(tot.eco) + ' movimentados nas seis edições.</p><div class="rv-h2">Movimento estimado por edição</div>' + stack(eco.map(function (x) { return { l: x.a, p: [x.alimT, x.hospT, x.combT] }; }), ['#047857', '#10b981', '#86efac']) + '<div class="rv-leg" style="display:flex;gap:6mm"><div><i style="background:#047857"></i>Alimentação</div><div><i style="background:#10b981"></i>Hospedagem</div><div><i style="background:#86efac"></i>Combustível</div></div></div><div><div class="rv-kpi"><div class="n">' + R(u.visita) + '</div><div class="l">gasto por equipe visitante (2026)</div><p>' + R(u.visita / PESS) + ' por pessoa</p></div><div style="margin-top:4mm">' + barrasH([{ l: 'Alimentação (2 dias)', v: u.alim }, { l: 'Hospedagem (1 noite)', v: u.hosp }, { l: 'Combustível (ida e volta)', v: u.comb }], R) + '</div><div class="rv-kpi" style="margin-top:4mm"><div class="n">' + R(u.total) + '</div><div class="l">movimento estimado em 2026</div><p>' + TIMES[5] + ' equipes</p></div></div></div></div><div class="rv-nota">Estimativas com premissas médias: alimentação R$ ' + PREM.alim + ' por pessoa/dia, hospedagem R$ ' + PREM.hosp + ' por pessoa/noite, 4 carros por equipe a 10 km/L e gasolina a R$ ' + PREM.gas.toFixed(2).replace('.', ',') + '. Uma equipe de Afonso Cláudio é considerada local e não gasta com hospedagem e combustível. Não são dados auditados.</div>'; } });
  add({ sec: S4, titulo: 'Premiação', html: function () {
    return '<div class="rv-blob" style="width:260mm;height:260mm;left:60mm;top:-40mm;opacity:.7"></div><div class="rv-in"><h1 class="rv-h">Valorizando quem joga</h1><p style="width:200mm">Durante quatro edições o título valia troféu e reconhecimento. Em 2025, pela primeira vez, a Supercopa passou a premiar em dinheiro, e a regra chega a 2026 como parte da identidade do torneio.</p><div class="rv-cols-3" style="margin-top:8mm">' +
      [['2021 a 2024', 'Troféus', 'Sem premiação em dinheiro'], ['2025 · campeão', 'R$ 1.000', 'Primeira premiação em dinheiro'], ['2025 · vice-campeão', 'R$ 500', 'Total de R$ 1.500 distribuídos']].map(function (k) { return '<div class="rv-kpi"><div class="l">' + k[0] + '</div><div class="n">' + k[1] + '</div><p>' + k[2] + '</p></div>'; }).join('') + '</div></div>' + foto(29, 'position:absolute;left:16mm;right:16mm;bottom:14mm;height:62mm'); } });

  /* 2026 */
  var S5 = 'Edição 2026';
  add({ tipo: 'div', sec: S5, cor: '#0b2a8f', cor2: '#1b52e0', html: function () { return fotoSite('destaque') + '<div class="t">' + S5 + '</div><div class="s">Vôlei e basquete, pela primeira vez juntos</div>'; } });
  add({ sec: S5, titulo: 'Equipes de 2026', html: function () {
    var ts = D.times || [];
    var cad = D.cad;
    return arco([210, 100, 170]) + '<div class="rv-in"><h1 class="rv-h">Equipes confirmadas no vôlei</h1><p style="width:210mm">O vôlei de 2026 acontece em 28 e 29 de novembro, em Afonso Cláudio, com 12 equipes de ' + (CID[2026].length) + ' cidades.</p>' +
      (ts.length ? '<div class="rv-esc" style="margin-top:5mm">' + ts.map(function (t) { return '<div>' + (t.escudo ? '<img src="' + esc(/^http/.test(t.escudo) ? t.escudo : SITE + t.escudo) + '" alt="" onerror="this.remove()">' : '') + esc(t.nome) + '<br><span style="font-weight:500;color:#5b6788">' + esc(String(t.cidade || '').replace(/ - [A-Z]{2}$/, '')) + '</span></div>'; }).join('') + '</div>' : '') +
      (cad && cad.pct >= 50 ? '<div class="rv-card" style="margin-top:6mm"><div class="rv-h2">Cadastro de atletas</div><div class="rv-cols" style="gap:8mm"><div class="rv-kpi" style="background:#fff"><div class="n">' + N(cad.atletas) + '</div><div class="l">atletas cadastrados</div><p>meta: ' + N(cad.meta) + ' vagas (14 por equipe)</p></div><div class="rv-kpi" style="background:#fff"><div class="n">' + cad.pct + '%</div><div class="l">das vagas preenchidas</div><p>prazo até 27 de novembro</p></div></div></div>' : '') + '</div>'; } });

  /* Parceiros */
  var S6 = 'Parceiros';
  add({ sec: S6, titulo: 'Quem apoia a Supercopa', cor: '#0b2a8f', html: function () {
    return '<div class="rv-in"><h1 class="rv-h">Quem faz a Supercopa acontecer</h1><p style="width:220mm">Empresas e instituições que acreditam no esporte da Região das Montanhas e tornam o torneio gratuito para as equipes.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:3mm 14mm;margin-top:4mm">' + PARC.map(function (g) { return '<div><div class="rv-h2">' + g[0] + '</div><div class="rv-pl ' + g[1] + '">' + g[2].map(function (x) { return '<img src="' + SITE + 'novo/parceiros/' + x[0] + '.png" alt="' + esc(x[1]) + '">'; }).join('') + '</div></div>'; }).join('') + '</div></div>'; } });

  add({ tipo: 'fim', html: function () { return '<div class="orb" style="width:180mm;height:180mm;left:-50mm;top:-60mm"></div><div class="orb" style="width:120mm;height:120mm;right:-30mm;bottom:-40mm"></div><div style="position:relative"><img src="' + SITE + 'novo/logo-branco.png" alt=""><div class="m">Obrigado a todos<br>que fazem a Supercopa</div><div class="u">supercopaafc.com.br · @supercopaafc</div></div>'; } });

  /* numeração e índice */
  var corpo = ''; var grupos = []; var cur = null;
  P.forEach(function (o, i) { o.n = i + 1; if (o.tipo === 'div') { cur = { t: o.sec, itens: [], cor: o.cor || '#1b52e0' }; grupos.push(cur); } else if (o.titulo && cur) cur.itens.push([o.titulo, o.n]); });
  ind.html = function () { return arco([200, 90, 180]) + '<div class="rv-in"><h1 class="rv-h" style="margin-left:30mm">Índice</h1><div class="rv-indice">' + grupos.map(function (g) { return '<div class="g" style="--gc:' + g.cor + '"><b>' + esc(g.t) + '</b>' + g.itens.map(function (x) { return '<div><span>' + esc(x[0]) + '</span><span>' + x[1] + '</span></div>'; }).join('') + '</div>'; }).join('') + '</div></div>'; };
  P.forEach(function (o, i) {
    var tipo = o.tipo || 'std', n = i + 1;
    var crumb = o.sec && tipo !== 'capa' && tipo !== 'fim' ? '<div class="rv-crumb">' + esc(o.sec) + '</div>' : '';
    var num = tipo !== 'capa' && tipo !== 'fim' ? '<div class="rv-num"><i></i>' + n + '</div>' : '';
    corpo += '<section class="rv-page rv-' + tipo + '" style="--c:' + (o.cor || '#1b52e0') + ';--c2:' + (o.cor2 || '#22c3ee') + '">' + crumb + o.html(n) + num + '</section>';
  });
  return corpo;
}

/* ---------- dados ao vivo ---------- */
function carregar() {
  var D = { acc: {} };
  return Promise.all([safe(get('count_acessos_site')), safe(get('count_acessos')), safe(get('count_installs')), safe(get('ranking_quiz')), safe(get('acessos_log')), safe(get('patrocinio_stats')), safe(get('timesPublicos')), safe(get('atletasTodos')), safe(get('statusCadastroEquipes'))]).then(function (r) {
    D.acc = { siteTotal: r[0] && r[0].total, appTotal: r[1] && r[1].total, instal: r[2] && r[2].total, quiz: r[3] && r[3].ranking ? r[3].ranking.length : null };
    var log = (r[4] && r[4].log) || [], m = {}; log.forEach(function (x) { var k = String(x.data).slice(0, 7); m[k] = m[k] || { a: 0, b: 0 }; if (x.plataforma === 'app') m[k].b++; else m[k].a++; });
    var MS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    D.meses = Object.keys(m).sort().slice(-8).map(function (k) { return { l: MS[+k.slice(5) - 1] + '/' + k.slice(2, 4), a: m[k].a, b: m[k].b }; });
    D.pat = r[5] && r[5].ok ? r[5] : null;
    D.times = (r[6] && r[6].times) || [];
    D.times.forEach(function (t) { if (/^ct das montanhas$/i.test(t.nome)) t.escudo = 'novo/escudos/ct-das-montanhas.png'; if (/^uni[aã]o v[oô]lei$/i.test(t.nome)) t.escudo = 'novo/escudos/uniao-volei.png'; });
    var at = (r[7] && r[7].atletas) || [], st = (r[8] && r[8].equipes) || [];
    if (st.length) { var na = at.filter(function (a) { return !a.tipo || /^atleta$/i.test(a.tipo); }).length, meta = st.length * 14; D.cad = { atletas: na, meta: meta, pct: Math.round(na / meta * 100) }; }
    return D;
  });
}

function iniciar() {
  var q = new URLSearchParams(location.search), pdf = q.has('pdf');
  document.body.classList.toggle('pdf', pdf);
  var host = document.getElementById('rv'); host.innerHTML = '<div class="rv-wrap"><p style="color:#fff;text-align:center;padding:40px">Reunindo os números...</p></div>';
  carregar().then(function (D) {
    host.innerHTML = '<div class="rv-wrap">' + montar(D) + '</div>';
    var go = function () { window.__pronto = true; if (q.get('print') === '1') setTimeout(function () { window.print(); }, 600); };
    var imgs = [].slice.call(document.images).filter(function (i) { return !i.complete; });
    if (!imgs.length) return go();
    var left = imgs.length, fim = function () { if (--left <= 0) go(); };
    imgs.forEach(function (i) { i.addEventListener('load', fim); i.addEventListener('error', fim); });
    setTimeout(go, 9000);
  });
}
window.rvIniciar = iniciar;
document.addEventListener('DOMContentLoaded', iniciar);
})();
