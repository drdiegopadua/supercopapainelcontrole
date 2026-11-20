/* Editor de fotos do relatório: escolhe a foto de cada lugar e enquadra na área real (mm) em que ela aparece. */
(function () {
'use strict';
var RV = window.RV; if (!RV) return;
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
var W = {}, GAL = null, painel = null;
function auth() { try { var a = sessionStorage.getItem('sca_auth') || localStorage.getItem('sca_auth'); return a ? JSON.parse(a) : null; } catch (e) { return null; } }
function post(a, d) { return fetch(RV.API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ acao: a }, d || {})) }).then(function (r) { return r.json(); }); }
function galeria() {
  if (GAL) return Promise.resolve(GAL);
  var S = RV.SITE, list = [];
  return Promise.all([
    fetch(S + 'galeria/galeria.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return null; }),
    fetch(RV.API + '?action=galeriaLista', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return null; })
  ]).then(function (r) {
    ((r[1] && r[1].fotos) || []).forEach(function (f) { list.push({ f: f.f, t: f.t || f.f }); });
    ((r[0] && r[0].fotos) || []).forEach(function (f) { list.push({ f: S + String(f.f).replace(/^\//, ''), t: S + String(f.t || f.f).replace(/^\//, '') }); });
    var vistos = {}; GAL = list.filter(function (x) { if (vistos[x.f]) return false; vistos[x.f] = 1; return true; });
    return GAL;
  });
}
function cur(id) { var o = W[id] || {}, d = RV.SLOTS[id]; return { src: o.src || d.src, x: o.x == null ? 50 : o.x, y: o.y == null ? 50 : o.y, z: o.z || 1 }; }
function moldura(id) {
  var d = RV.SLOTS[id], k = Math.min(520 / d.w, 330 / d.h), w = Math.round(d.w * k), h = Math.round(d.h * k);
  var extra = d.k === 'capa' ? '<div class="ed-ov" style="background:linear-gradient(90deg,#0b2a8f 0%,rgba(11,42,143,.6) 26%,rgba(11,42,143,0) 62%)"></div>' : '';
  var rad = d.k === 'arco' ? 'border-radius:50% 50% 6.5% 6.5% / 27% 27% 3.5% 3.5%;' : '';
  var bg = d.k === 'bg' ? 'opacity:.55;' : '';
  return '<div class="ed-fr" data-id="' + id + '" style="width:' + w + 'px;height:' + h + 'px;' + rad + '"><img alt="" draggable="false" style="' + bg + '">' + extra + '</div>';
}
function pinta(id) {
  var fr = painel.querySelector('.ed-fr[data-id="' + id + '"]'); if (!fr) return;
  var c = cur(id), im = fr.querySelector('img'); if (im.getAttribute('src') !== c.src) im.src = c.src;
  im.style.cssText = RV.imgEstilo(c) + ';position:absolute;object-fit:cover;' + (RV.SLOTS[id].k === 'bg' ? 'opacity:.55;' : '');
  var z = painel.querySelector('input[data-z="' + id + '"]'); if (z) z.value = c.z;
}
function arrasta(fr, id) {
  var dr = null;
  fr.addEventListener('pointerdown', function (e) { var c = cur(id); dr = { px: e.clientX, py: e.clientY, x: c.x, y: c.y }; fr.setPointerCapture(e.pointerId); e.preventDefault(); });
  fr.addEventListener('pointermove', function (e) {
    if (!dr) return; var im = fr.querySelector('img'), c = cur(id), nw = im.naturalWidth || 1, nh = im.naturalHeight || 1, fw = fr.clientWidth, fh = fr.clientHeight;
    var sc = Math.max(fw / nw, fh / nh) * c.z, ovx = nw * sc - fw, ovy = nh * sc - fh;
    var x = ovx > 1 ? dr.x - (e.clientX - dr.px) / ovx * 100 * 1 : dr.x, y = ovy > 1 ? dr.y - (e.clientY - dr.py) / ovy * 100 : dr.y;
    // com aproximação, o ponto focal percorre toda a imagem: x,y limitados a 0-100
    W[id] = Object.assign({}, W[id], { src: c.src, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)), z: c.z }); pinta(id);
  });
  var fim = function () { dr = null; }; fr.addEventListener('pointerup', fim); fr.addEventListener('pointercancel', fim);
}
function escolher(id) {
  var m = document.createElement('div'); m.className = 'ed-pick';
  m.innerHTML = '<div class="ed-pk"><div class="ed-pt"><b>Escolha a foto · ' + esc(RV.SLOTS[id].n) + '</b><button type="button" class="ed-x">Fechar</button></div><div class="ed-pg" id="edPg"><p style="color:#fff">Carregando fotos…</p></div></div>';
  document.body.appendChild(m); m.querySelector('.ed-x').onclick = function () { m.remove(); };
  galeria().then(function (g) {
    var pg = m.querySelector('#edPg'), def = RV.SLOTS[id].src;
    var itens = [{ f: def, t: def, o: true }].concat(g);
    pg.innerHTML = itens.map(function (x, i) { return '<button type="button" data-i="' + i + '">' + (x.o ? '<span>Original</span>' : '') + '<img loading="lazy" alt="" src="' + esc(x.t) + '"></button>'; }).join('');
    pg.onclick = function (e) { var b = e.target.closest('button[data-i]'); if (!b) return; var x = itens[+b.dataset.i]; W[id] = { src: x.f, x: 50, y: 50, z: 1 }; pinta(id); m.remove(); };
  });
}
function abrir() {
  if (painel) { painel.remove(); }
  painel = document.createElement('div'); painel.className = 'ed-bg';
  var ids = Object.keys(RV.SLOTS), a = auth();
  W = JSON.parse(JSON.stringify(RV.get() || {}));
  painel.innerHTML = '<div class="ed-top"><b>Fotos do relatório</b><span>Arraste a foto para enquadrar e use o controle para aproximar. A moldura tem o tamanho e o formato reais da área no relatório.</span><div class="ed-ac"><button type="button" class="ed-s">Salvar e atualizar relatório</button><button type="button" class="ed-c">Fechar</button></div></div>'
    + '<div class="ed-msg" id="edMsg"></div><div class="ed-lg" id="edLg" style="' + (a ? 'display:none' : '') + '"><b>Entre para salvar</b><input id="edU" placeholder="Usuário" autocomplete="username"><input id="edP" type="password" placeholder="Senha" autocomplete="current-password"></div>'
    + '<div class="ed-gr">' + ids.map(function (id) { var d = RV.SLOTS[id];
      return '<div class="ed-card"><div class="ed-h"><b>' + esc(d.n) + '</b><small>' + Math.round(d.w) + ' × ' + Math.round(d.h) + ' mm</small></div>' + moldura(id) + '<small class="ed-n">' + esc(d.nota) + '</small>'
        + '<div class="ed-ct"><label>Zoom <input type="range" min="1" max="4" step="0.05" value="1" data-z="' + id + '"></label><button type="button" data-t="' + id + '">Trocar foto</button><button type="button" data-r="' + id + '">Original</button></div></div>'; }).join('') + '</div>';
  document.body.appendChild(painel); document.body.classList.add('ed-on');
  ids.forEach(function (id) { arrasta(painel.querySelector('.ed-fr[data-id="' + id + '"]'), id); pinta(id); });
  painel.addEventListener('input', function (e) { var z = e.target.dataset && e.target.dataset.z; if (!z) return; var c = cur(z); W[z] = { src: c.src, x: c.x, y: c.y, z: +e.target.value }; pinta(z); });
  painel.addEventListener('click', function (e) {
    var t = e.target.closest('[data-t]'), r = e.target.closest('[data-r]');
    if (t) escolher(t.dataset.t); if (r) { delete W[r.dataset.r]; pinta(r.dataset.r); }
  });
  painel.querySelector('.ed-c').onclick = fechar;
  painel.querySelector('.ed-s').onclick = salvar;
}
function fechar() { if (painel) painel.remove(); painel = null; document.body.classList.remove('ed-on'); }
function salvar() {
  var msg = painel.querySelector('#edMsg'), a = auth(), u = painel.querySelector('#edU'), p = painel.querySelector('#edP');
  if (!a && u && u.value && p.value) a = { usuario: u.value.trim(), senha: p.value };
  var local = function (txt) { try { localStorage.setItem('rv_fotos', JSON.stringify(W)); } catch (e) {} msg.textContent = txt; setTimeout(function () { location.reload(); }, 900); };
  if (!a) { msg.textContent = 'Informe usuário e senha da organização para salvar.'; painel.querySelector('#edLg').style.display = ''; return; }
  msg.textContent = 'Salvando…';
  post('relatorioFotosSalvar', { auth: a, slots: W }).then(function (r) {
    if (r && r.ok) { try { localStorage.removeItem('rv_fotos'); } catch (e) {} msg.textContent = 'Salvo! Atualizando o relatório…'; setTimeout(function () { location.reload(); }, 700); }
    else msg.textContent = (r && r.erro) || 'Não foi possível salvar.';
  }).catch(function () { local('Sem conexão com o servidor: escolhas salvas só neste aparelho.'); });
}
window.rvFotos = abrir;
})();
