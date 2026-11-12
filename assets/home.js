/* Home page: fills every section from config.js and the hospital system (doctors are live). */
(function () {
  'use strict';
  var T = window.Site, el = T.el, $ = T.$, C = T.C;

  function initials(name) { return String(name).replace(/^dr\.?\s+/i, '').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); }
  function drName(n) { return 'Dr. ' + String(n || '').replace(/^dr\.?\s+/i, ''); }
  function section(id, show) { var s = $('#' + id); if (s) s.hidden = !show; }

  T.ready.then(function () {
    T.build('home');
    var i = T.info();

    $('#hero-title').textContent = C.heroTitle || i.name;
    $('#hero-text').textContent = C.heroText || i.tagline;
    var pts = $('#hero-points'); (C.highlights || []).forEach(function (h) { pts.appendChild(el('li', { text: h })); });
    var call = $('#hero-call'); if (i.phone) { call.textContent = 'Call ' + i.phone; call.href = T.telHref(i.phone); }
    var side = $('#hero-side');
    if (T.safeUrl(C.heroImage)) side.appendChild(el('div', { class: 'hero__img' }, el('img', { src: C.heroImage, alt: '', loading: 'eager' })));
    else side.appendChild(el('div', { class: 'hero__card' }, [el('h2', { text: 'Book in 3 easy steps' }),
      el('ol', { style: 'margin:0 0 16px;padding-left:20px;color:#33405f' }, [el('li', { text: 'Choose your doctor' }), el('li', { text: 'Pick a day and time' }), el('li', { text: 'Enter your name and mobile number' })]),
      el('a', { class: 'btn btn--primary btn--block', href: 'book.html', text: 'Start booking' })]));

    // quick info
    var strip = $('#strip');
    strip.appendChild(el('div', { class: 'tile' }, [el('div', { class: 'tile__icon', text: '🕘' }), el('div', {}, [el('h3', { text: 'Opening hours' }),
      el('p', { text: (C.hours || []).map(function (h) { return h[0] + ': ' + h[1]; }).join(' · ') })])]));
    if (i.emergency) strip.appendChild(el('div', { class: 'tile' }, [el('div', { class: 'tile__icon', text: '🚑' }), el('div', {}, [el('h3', { text: 'Emergency 24×7' }), el('p', {}, el('a', { href: T.telHref(i.emergency), text: i.emergency }))])]));
    if (i.phone) strip.appendChild(el('div', { class: 'tile' }, [el('div', { class: 'tile__icon', text: '📞' }), el('div', {}, [el('h3', { text: 'Appointments' }), el('p', {}, el('a', { href: T.telHref(i.phone), text: i.phone }))])]));
    if (i.address) strip.appendChild(el('div', { class: 'tile' }, [el('div', { class: 'tile__icon', text: '📍' }), el('div', {}, [el('h3', { text: 'Find us' }), el('p', { text: i.address })])]));
    if (!strip.children.length) $('.strip').hidden = true;

    // departments
    var dg = $('#dept-grid');
    (C.departments || []).forEach(function (d) {
      dg.appendChild(el('article', { class: 'card' }, [el('div', { class: 'card__icon', 'aria-hidden': 'true', text: d.icon || '🏥' }), el('h3', { text: d.name }), el('p', { text: d.text || '' })]));
    });
    section('departments', dg.children.length > 0);

    // why us + stats + voices + faq
    var wg = $('#why-grid'); (C.why || []).forEach(function (w) { wg.appendChild(el('article', { class: 'card' }, [el('div', { class: 'card__icon', 'aria-hidden': 'true', text: w.icon || '✔' }), el('h3', { text: w.title }), el('p', { text: w.text || '' })])); });
    var st = $('#stats'); (C.stats || []).forEach(function (s) { st.appendChild(el('div', {}, [el('b', { text: s[0] }), el('span', { text: s[1] })])); });
    var vg = $('#voice-grid'); (C.testimonials || []).forEach(function (v) { vg.appendChild(el('blockquote', { class: 'card quote', style: 'margin:0' }, [el('p', { text: '“' + v.quote + '”' }), el('footer', {}, [v.name || '', v.role ? el('span', { text: v.role }) : null])])); });
    section('voices', vg.children.length > 0);
    var fl = $('#faq-list'); (C.faqs || []).forEach(function (f) { fl.appendChild(el('details', {}, [el('summary', { text: f.q }), el('p', { text: f.a })])); });
    section('faq', fl.children.length > 0);

    // contact
    var cc = $('#contact-card');
    cc.appendChild(el('h3', { text: i.name }));
    if (i.address) cc.appendChild(el('p', { text: '📍 ' + i.address }));
    if (i.phone) cc.appendChild(el('p', {}, ['📞 ', el('a', { href: T.telHref(i.phone), text: i.phone })]));
    if (i.whatsapp) cc.appendChild(el('p', {}, ['💬 ', el('a', { href: 'https://wa.me/' + i.whatsapp, target: '_blank', rel: 'noopener', text: 'Message us on WhatsApp' })]));
    if (i.email) cc.appendChild(el('p', {}, ['✉️ ', el('a', { href: 'mailto:' + i.email, text: i.email })]));
    if (T.safeUrl(i.mapsUrl)) cc.appendChild(el('p', {}, el('a', { class: 'btn btn--ghost btn--sm', href: i.mapsUrl, target: '_blank', rel: 'noopener', text: 'Open in Google Maps' })));
    var tb = el('table', { class: 'hours' }); (C.hours || []).forEach(function (h) { tb.appendChild(el('tr', {}, [el('td', { text: h[0] }), el('td', { text: h[1] })])); });
    if ((C.hours || []).length) { cc.appendChild(el('h4', { style: 'margin-top:18px', text: 'Opening hours' })); cc.appendChild(tb); }

    // doctors — live
    T.api('/doctors').then(function (r) {
      var g = $('#doc-grid'); T.clear(g);
      if (!r.ok || !r.data || !r.data.length) { section('doctors', false); var a = document.querySelector('nav a[href="index.html#doctors"]'); if (a) a.hidden = true; return; }
      r.data.forEach(function (d) {
        g.appendChild(el('article', { class: 'card doc' }, [
          el('div', { class: 'doc__top' }, [el('div', { class: 'avatar', 'aria-hidden': 'true', text: initials(d.name) }), el('div', {}, [el('h3', { text: drName(d.name) }), d.dept ? el('div', { class: 'dept', text: d.dept }) : null])]),
          d.qual ? el('div', { class: 'qual', text: d.qual }) : null,
          Number(d.fee) > 0 ? el('div', { class: 'fee', text: 'Consultation fee: ₹' + Number(d.fee).toLocaleString('en-IN') }) : null,
          el('a', { class: 'btn btn--primary btn--sm', href: 'book.html?doctor=' + encodeURIComponent(d.name), text: 'Book with ' + drName(d.name).split(' ').slice(0, 2).join(' ') }),
        ]));
      });
    });
  });
})();
