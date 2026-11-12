/* ── Hospital website: shared code ────────────────────────────────────────────
   Reads the hospital's public details from the hospital system, falls back to config.js, builds the header and footer,
   and offers the login chooser. Every piece of text that comes from the network is put on the page with textContent —
   never as HTML — so nothing a visitor or an API returns can run as a script. */
(function () {
  'use strict';
  var C = window.HOSPITAL_SITE || {};
  var S = { api: String(C.apiBase || '').replace(/\/+$/, ''), slug: String(C.slug || 'qmh').toLowerCase(), settings: null, portalOn: null };

  // ── tiny DOM helper ──
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    [].concat(kids == null ? [] : kids).forEach(function (c) { if (c != null && c !== false) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }

  // ── the hospital system's public API ──
  function api(path, opts) {
    opts = opts || {};
    var url = S.api + '/api/public' + path + (path.indexOf('?') < 0 ? '?' : '&') + 'tenant=' + encodeURIComponent(S.slug);
    return fetch(url, { method: opts.method || 'GET', headers: opts.body ? { 'Content-Type': 'application/json' } : undefined, body: opts.body ? JSON.stringify(Object.assign({ tenant: S.slug }, opts.body)) : undefined })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'The server sent an unreadable answer.' }; }).then(function (j) { j.status = r.status; return j; }); })
      .catch(function () { return { ok: false, status: 0, error: 'We could not reach the hospital system. Please check your internet connection and try again.' }; });
  }

  // ── details: live settings over config fallbacks ──
  function info() {
    var s = S.settings || {};
    var name = s.hospitalName || C.name || 'Hospital';
    return {
      name: name, shortName: s.shortName || name,
      tagline: s.tagline || C.tagline || '', logo: s.logoUrl || '',
      phone: s.phone || C.phone || '', whatsapp: (s.whatsapp || C.whatsapp || '').replace(/\D/g, ''), email: s.email || C.email || '',
      address: s.address || C.address || '', mapsUrl: s.mapsUrl || C.mapsUrl || '', emergency: C.emergencyPhone || '',
      slotMinutes: s.slotMinutes || 10,
    };
  }
  function telHref(p) { return 'tel:' + String(p || '').replace(/[^\d+]/g, ''); }
  function safeUrl(u) { return /^https?:\/\//i.test(String(u || '')) ? u : ''; }

  function applyTheme() {
    var c = C.colors || {}, r = document.documentElement.style;
    if (c.navy) r.setProperty('--navy', c.navy); if (c.navy2) r.setProperty('--navy-2', c.navy2);
    if (c.gold) r.setProperty('--gold', c.gold); if (c.soft) r.setProperty('--soft', c.soft);
  }

  // ── login chooser ──
  function appUrl() { return String(C.appUrl || '').replace(/\/+$/, ''); }
  function loginUrl(kind) {
    var a = appUrl(); if (!a) return '';
    return kind === 'patient' ? a + '/my/' + encodeURIComponent(S.slug) : a + '/?hospital=' + encodeURIComponent(S.slug);
  }
  function loginCards() {
    var i = info(), wrap = el('div', { class: 'login-cards' });
    function card(kind, icon, title, text, cta) {
      var url = loginUrl(kind);
      var body = [el('div', { class: 'login-card__icon', 'aria-hidden': 'true', text: icon }), el('h3', { text: title }), el('p', { text: text })];
      if (url) body.push(el('a', { class: 'btn btn--primary', href: url, text: cta }));
      else body.push(el('p', { class: 'muted small', text: 'Online login is not switched on yet.' + (i.phone ? ' Please call ' + i.phone + '.' : '') }));
      return el('div', { class: 'login-card' }, body);
    }
    if (S.portalOn !== false) wrap.appendChild(card('patient', '🙋', 'Patient login', 'See your appointments, bills and receipts. We send a one-time code to your WhatsApp — no password to remember.', 'Sign in as a patient'));
    wrap.appendChild(card('staff', '🩺', 'Staff login', 'For doctors, nurses, the front desk, pharmacy and administrators of ' + i.name + '.', 'Staff sign in'));
    return wrap;
  }
  function openLogin() {
    var back = el('div', { class: 'modal-bg', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Login' });
    function close() { document.removeEventListener('keydown', esc); back.remove(); }
    function esc(e) { if (e.key === 'Escape') close(); }
    var box = el('div', { class: 'modal' }, [
      el('button', { class: 'modal__x', 'aria-label': 'Close', text: '×', onclick: close }),
      el('h2', { text: 'Login' }), el('p', { class: 'muted', text: 'Choose how you would like to sign in.' }), loginCards(),
    ]);
    back.appendChild(box); back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', esc); document.body.appendChild(back);
    var first = box.querySelector('a, button.modal__x'); if (first) first.focus();
  }

  // ── header, footer, floating buttons ──
  function logoNode(i) {
    if (safeUrl(i.logo)) return el('img', { class: 'brand__logo', src: i.logo, alt: '', width: '38', height: '38' });
    var initials = (i.shortName || i.name).split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    return el('span', { class: 'brand__mark', 'aria-hidden': 'true', text: initials });
  }
  function build(active) {
    applyTheme();
    var i = info(), page = active || '';
    document.title = (document.body.getAttribute('data-title') ? document.body.getAttribute('data-title') + ' — ' : '') + i.name;
    var links = [['index.html', 'Home', 'home'], ['index.html#departments', 'Departments', ''], ['index.html#doctors', 'Doctors', ''], ['index.html#about', 'About', ''], ['index.html#contact', 'Contact', '']];
    var nav = el('nav', { class: 'nav', id: 'nav', 'aria-label': 'Main' }, links.map(function (l) { return el('a', { href: l[0], class: l[2] && l[2] === page ? 'is-active' : '', text: l[1] }); }));
    // on a phone the two main buttons live inside the opened menu
    nav.appendChild(el('div', { class: 'nav__mobile' }, [
      el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Login', onclick: openLogin }),
      el('a', { class: 'btn btn--gold btn--sm', href: 'book.html', text: 'Book appointment' }),
    ]));
    var burger = el('button', { class: 'burger', 'aria-label': 'Menu', 'aria-expanded': 'false', 'aria-controls': 'nav', text: '☰', onclick: function () {
      var open = nav.classList.toggle('is-open'); burger.setAttribute('aria-expanded', open ? 'true' : 'false'); burger.textContent = open ? '✕' : '☰'; } });
    var head = el('header', { class: 'top' }, el('div', { class: 'wrap top__row' }, [
      el('a', { class: 'brand', href: 'index.html' }, [logoNode(i), el('span', { class: 'brand__name', text: i.shortName })]),
      nav,
      el('div', { class: 'top__cta' }, [
        el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Login', onclick: openLogin }),
        el('a', { class: 'btn btn--gold btn--sm', href: 'book.html', text: 'Book appointment' }),
      ]),
      burger,
    ]));
    nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') { nav.classList.remove('is-open'); burger.textContent = '☰'; } });
    var old = $('#site-header'); if (old) old.replaceWith(head); else document.body.insertBefore(head, document.body.firstChild);
    head.id = 'site-header';

    var foot = el('footer', { class: 'foot' }, el('div', { class: 'wrap foot__grid' }, [
      el('div', {}, [el('div', { class: 'brand brand--foot' }, [logoNode(i), el('span', { class: 'brand__name', text: i.name })]), el('p', { class: 'muted', text: i.tagline })]),
      el('div', {}, [el('h4', { text: 'Visit' }), i.address ? el('p', { text: i.address }) : null, i.phone ? el('p', {}, el('a', { href: telHref(i.phone), text: i.phone })) : null,
        i.email ? el('p', {}, el('a', { href: 'mailto:' + i.email, text: i.email })) : null]),
      el('div', {}, [el('h4', { text: 'Quick links' }), el('p', {}, el('a', { href: 'book.html', text: 'Book an appointment' })),
        el('p', {}, el('a', { href: 'login.html', text: 'Patient & staff login' })), el('p', {}, el('a', { href: 'privacy.html', text: 'Privacy' }))]),
    ]));
    var copy = el('div', { class: 'wrap foot__copy' }, '© ' + new Date().getFullYear() + ' ' + i.name + '. All rights reserved.');
    var oldF = $('#site-footer'); var f = el('div', { id: 'site-footer' }, [foot, copy]); if (oldF) oldF.replaceWith(f); else document.body.appendChild(f);

    var oldW = $('.float-wa'); if (oldW) oldW.remove();
    if (i.whatsapp) document.body.appendChild(el('a', { class: 'float-wa', href: 'https://wa.me/' + i.whatsapp, target: '_blank', rel: 'noopener', 'aria-label': 'Chat with us on WhatsApp', text: '💬' }));
    // search-engine details for the hospital
    var ld = $('#ld-json'); if (ld) ld.remove();
    var data = { '@context': 'https://schema.org', '@type': 'Hospital', name: i.name, description: i.tagline, telephone: i.phone, email: i.email, address: i.address };
    document.head.appendChild(el('script', { type: 'application/ld+json', id: 'ld-json', text: JSON.stringify(data) }));
  }

  // ── start: fetch the hospital's public details once, then draw ──
  var ready = Promise.all([
    api('/settings').then(function (r) { if (r.ok) S.settings = r.data; }),
    api('/portal/info').then(function (r) { S.portalOn = r.ok ? !!(r.data && r.data.enabled) : null; }),
  ]).then(function () { return S; });

  window.Site = { C: C, S: S, el: el, $: $, clear: clear, api: api, info: info, telHref: telHref, safeUrl: safeUrl, build: build, ready: ready, loginCards: loginCards, openLogin: openLogin };
})();
