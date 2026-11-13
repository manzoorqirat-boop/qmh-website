/* Online appointment booking.
   Uses only the hospital system's public API: /doctors, /booking-config, /booked-slots and POST /appointments.
   Two modes, set by the hospital in Settings → Online booking:
     direct  — the chosen slot is booked at once.
     request — the visitor asks; the front desk confirms later (the doctor and time are a preference).
   The slots shown follow the doctor's working days and hours and hide taken ones; the server checks all of it again. */
(function () {
  'use strict';
  var T = window.Site, el = T.el, $ = T.$;
  var IST = 330 * 60000, DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var st = { cfg: null, doctors: [], dept: '', doctor: null, any: false, date: '', time: '', hours: {}, booked: [], slotsLoading: false, shownDays: 14, busy: false };

  // ── dates in India time ──
  function istNow() { return new Date(Date.now() + IST); }
  function todayStr() { return istNow().toISOString().slice(0, 10); }
  function addDays(s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function wkey(s) { return DAYS[new Date(s + 'T00:00:00Z').getUTCDay()]; }
  function mins(t) { var m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; }
  function hhmm(n) { return ('0' + Math.floor(n / 60)).slice(-2) + ':' + ('0' + (n % 60)).slice(-2); }
  function nice12(t) { var n = mins(t), h = Math.floor(n / 60), m = n % 60; return ((h + 11) % 12 + 1) + ':' + ('0' + m).slice(-2) + ' ' + (h < 12 ? 'am' : 'pm'); }
  function niceDate(s) { var d = new Date(s + 'T00:00:00Z'); return DAYN[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function drName(n) { return 'Dr. ' + String(n || '').replace(/^dr\.?\s+/i, ''); }
  function initials(n) { return String(n).replace(/^dr\.?\s+/i, '').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); }

  function notice(msg, kind) { var n = T.clear($('#notice')); if (msg) n.appendChild(el('div', { class: 'alert alert--' + (kind || 'bad'), role: 'alert', text: msg })); if (msg) n.scrollIntoView({ block: 'nearest' }); }

  // ── working hours + slots ──
  function hoursOf(name) { return st.hours[name] || null; }
  function slotLen() { var h = st.doctor && hoursOf(st.doctor.name); return (h && Number(h.slotMinutes) > 0) ? Number(h.slotMinutes) : (T.info().slotMinutes || 10); }
  function dayAllowed(date) {
    if (st.any || !st.doctor) return wkey(date) !== 'sun';
    var h = hoursOf(st.doctor.name); if (!h || !Array.isArray(h.days) || !h.days.length) return true;
    return h.days.map(String).map(function (d) { return d.toLowerCase(); }).indexOf(wkey(date)) >= 0;
  }
  function makeSlots() {
    var h = st.doctor && hoursOf(st.doctor.name) || {}, start = mins(h.start), end = mins(h.end);
    if (start == null) start = 9 * 60; if (end == null) end = 17 * 60;
    var L = st.any ? 30 : slotLen(), out = [], booked = st.booked.map(mins).filter(function (x) { return x != null; });
    var nowMin = (st.date === todayStr()) ? istNow().getUTCHours() * 60 + istNow().getUTCMinutes() + (st.cfg.cutoffMinutes || 0) : -1;
    for (var t = start; t + L <= end; t += L) {
      if (t < nowMin) continue;
      var clash = !st.any && booked.some(function (e) { return t < e + L && e < t + L; });
      if (!clash) out.push(hhmm(t));
    }
    return out;
  }

  // ── network ──
  function loadHours(doctor) {
    if (st.hours[doctor.name] !== undefined) return Promise.resolve();
    return T.api('/booked-slots?doctor=' + encodeURIComponent(doctor.name) + '&date=' + todayStr()).then(function (r) { st.hours[doctor.name] = (r.ok && r.data && r.data.workingHours) || null; });
  }
  function loadBooked() {
    st.slotsLoading = true; st.booked = []; render();
    if (st.any || !st.doctor) { st.slotsLoading = false; render(); return; }
    var d = st.doctor.name, date = st.date;
    T.api('/booked-slots?doctor=' + encodeURIComponent(d) + '&date=' + date).then(function (r) {
      if (st.doctor && st.doctor.name === d && st.date === date) {                      // ignore an answer for a choice that has changed
        if (r.ok && r.data) { st.booked = r.data.bookedTimes || []; if (r.data.workingHours) st.hours[d] = r.data.workingHours; }
        st.slotsLoading = false; render();
      }
    });
  }

  // ── choices ──
  function pickDoctor(d) {
    st.doctor = d; st.any = false; st.date = ''; st.time = ''; st.booked = []; st.shownDays = 14; notice('');
    loadHours(d).then(render);
    render();
  }
  function pickAny() { st.doctor = null; st.any = true; st.date = ''; st.time = ''; st.booked = []; st.shownDays = 14; notice(''); render(); }
  function pickDate(date) { st.date = date; st.time = ''; notice(''); loadBooked(); }
  function pickTime(t) { st.time = t; notice(''); render(); }

  // ── the form values live outside render() so typing is never lost ──
  var F = { name: '', mobile: '', age: '', gender: '', email: '', reason: '', consent: false, hp: '', forChild: null, dob: '', guardian: '', relation: '' };
  // a children's hospital starts on "for a child"; anyone else can tick it
  function isChild() { return F.forChild === null ? !!(st.cfg && st.cfg.profile === 'paediatric') : F.forChild; }
  function isoToday() { return todayStr(); }
  function eighteenAgo() { var t = todayStr(); return (Number(t.slice(0, 4)) - ((st.cfg && st.cfg.childMaxYears) || 18)) + t.slice(4); }
  function validate() {
    var e = {};
    if (!F.name.trim()) e.name = isChild() ? 'Please enter the child\'s name.' : 'Please enter the patient\'s name.';
    if (isChild()) {
      if (!F.dob) e.dob = 'Please enter the child\'s date of birth.';
      else if (F.dob > isoToday()) e.dob = 'The date of birth cannot be in the future.';
      else if (F.dob <= eighteenAgo()) e.dob = 'Online booking for a child is for children under 18. Please book as an adult.';
      if (!F.guardian.trim()) e.guardian = 'Please enter the parent or guardian\'s name.';
    }
    var m = F.mobile.replace(/[\s-]/g, ''); if (m.indexOf('+91') === 0) m = m.slice(3); if (m.charAt(0) === '0') m = m.slice(1);
    if (!/^\d{10}$/.test(m)) e.mobile = 'Please enter a 10-digit mobile number.';
    if (!isChild() && F.age !== '' && !(Number(F.age) >= 0 && Number(F.age) <= 120)) e.age = 'Age must be between 0 and 120.';
    if (F.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(F.email)) e.email = 'Please enter a valid email address.';
    if (st.cfg.consent && !F.consent) e.consent = 'Please tick the box to agree.';
    return { errors: e, mobile: m };
  }
  function ready() {
    var okChoice = (st.any ? !!st.date : !!st.doctor && !!st.date && !!st.time) && (st.mode === 'request' ? !!st.date : true);
    if (st.mode === 'direct' && st.any) okChoice = false;
    return okChoice;
  }

  // ── submit ──
  function submit() {
    notice('');
    var v = validate(); var keys = Object.keys(v.errors);
    if (!ready()) { notice('Please choose a doctor, a day and a time first.'); return; }
    if (keys.length) { showErrors(v.errors); notice(v.errors[keys[0]]); return; }
    if (F.hp) return;                                                                  // a robot filled the hidden field
    st.busy = true; render();
    var body = { patientName: F.name.trim(), mobile: v.mobile, age: isChild() || F.age === '' ? '' : String(Math.floor(Number(F.age))), gender: F.gender, date: st.date, time: st.time,
      doctor: st.doctor ? st.doctor.name : '', dept: st.doctor ? (st.doctor.dept || '') : '', reason: F.reason.trim(), email: F.email.trim(), consent: !!F.consent };
    if (isChild()) { body.forChild = true; body.childDob = F.dob; body.guardianName = F.guardian.trim(); body.guardianRelation = F.relation; }
    T.api('/appointments', { method: 'POST', body: body }).then(function (r) {
      st.busy = false;
      if (r.ok) return done(r.data, body);
      notice(r.error || 'We could not complete your booking. Please try again or call the hospital.');
      if (r.status === 409 && st.doctor) { st.time = ''; loadBooked(); } else render();     // the slot was just taken: show fresh slots
    });
  }
  function showErrors(errs) { Object.keys(errs).forEach(function (k) { var f = $('[data-err="' + k + '"]'); if (f) f.textContent = errs[k]; }); }

  // ── confirmation ──
  function ics(body) {
    var d = body.date.replace(/-/g, ''), s = mins(body.time) || 540, e = s + (slotLen() || 15), i = T.info();
    function stamp(n) { return d + 'T' + hhmm(n).replace(':', '') + '00'; }
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hospital website//EN', 'BEGIN:VEVENT', 'UID:' + Date.now() + '@hospital-site', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      'DTSTART;TZID=Asia/Kolkata:' + stamp(s), 'DTEND;TZID=Asia/Kolkata:' + stamp(e), 'SUMMARY:Appointment at ' + i.name + (body.doctor ? ' with ' + drName(body.doctor) : ''),
      'LOCATION:' + (i.address || i.name).replace(/[,;\n]/g, ' '), 'END:VEVENT', 'END:VCALENDAR'];
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
  }
  function done(res, body) {
    var i = T.info(), req = !!res.request, ref = res.ref || String(res.id || '').slice(-6).toUpperCase();
    var app = T.clear($('#app'));
    var rows = [[body.forChild ? 'Child' : 'Name', body.patientName]].concat(body.forChild ? [['Parent / guardian', body.guardianName]] : []).concat([['Doctor', body.doctor ? drName(body.doctor) : 'Any available doctor'], ['Date', niceDate(body.date)], ['Time', body.time ? nice12(body.time) : 'To be confirmed'], ['Reference', ref]]);
    if (!req && Number(res.fee) > 0) rows.push(['Consultation fee', '₹' + Number(res.fee).toLocaleString('en-IN') + ' (pay at the hospital)']);
    var dl = el('dl'); rows.forEach(function (r) { dl.appendChild(el('dt', { text: r[0] })); dl.appendChild(el('dd', { text: r[1] })); });
    var btns = el('div', { class: 'done__btns' });
    if (!req && body.time) btns.appendChild(el('a', { class: 'btn btn--primary', href: ics(body), download: 'appointment.ics', text: 'Add to my calendar' }));
    if (i.whatsapp) btns.appendChild(el('a', { class: 'btn btn--ghost', target: '_blank', rel: 'noopener', href: 'https://wa.me/' + i.whatsapp + '?text=' + encodeURIComponent('Hello, my appointment reference is ' + ref), text: 'Message us on WhatsApp' }));
    btns.appendChild(el('a', { class: 'btn btn--ghost', href: 'index.html', text: 'Back to home' }));
    app.appendChild(el('div', { class: 'step done', role: 'status' }, [
      el('div', { class: 'done__tick', 'aria-hidden': 'true', text: '✓' }),
      el('h2', { style: 'justify-content:center', text: req ? 'Request received' : 'Your appointment is booked' }),
      el('p', { class: 'muted', text: req ? 'Our front desk will confirm your appointment soon, usually by WhatsApp or a phone call. Please keep your reference handy.' : 'Please arrive 15 minutes early and bring a photo ID and any earlier reports. You pay the fee at the reception.' }),
      dl, btns,
      i.phone ? el('p', { class: 'small muted', text: 'To change or cancel, call ' + i.phone + ' and quote your reference.' }) : null,
    ]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── drawing ──
  function stepBox(n, title, kids, doneFlag, off) { return el('section', { class: 'step' + (doneFlag ? ' is-done' : '') + (off ? ' is-off' : '') }, [el('h2', {}, [el('span', { class: 'n', text: doneFlag ? '✓' : String(n) }), title])].concat(kids)); }

  function renderDoctorStep() {
    var depts = []; st.doctors.forEach(function (d) { if (d.dept && depts.indexOf(d.dept) < 0) depts.push(d.dept); });
    var kids = [];
    if (depts.length > 1) {
      var chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Department' });
      [''].concat(depts).forEach(function (d) { chips.appendChild(el('button', { class: 'chip', type: 'button', 'aria-pressed': st.dept === d ? 'true' : 'false', text: d || 'All doctors', onclick: function () { st.dept = d; render(); } })); });
      kids.push(chips);
    }
    var pick = el('div', { class: 'docpick' });
    if (st.mode === 'request' && st.cfg.anyDoctor) pick.appendChild(el('button', { class: 'docopt', type: 'button', 'aria-pressed': st.any ? 'true' : 'false', onclick: pickAny }, [el('div', { class: 'avatar', 'aria-hidden': 'true', text: '★' }), el('div', {}, [el('b', { text: 'Any available doctor' }), el('small', { text: 'We will choose for you' })])]));
    st.doctors.filter(function (d) { return !st.dept || d.dept === st.dept; }).forEach(function (d) {
      var sel = st.doctor && st.doctor.name === d.name;
      pick.appendChild(el('button', { class: 'docopt', type: 'button', 'aria-pressed': sel ? 'true' : 'false', onclick: function () { pickDoctor(d); } }, [
        el('div', { class: 'avatar', 'aria-hidden': 'true', text: initials(d.name) }),
        el('div', {}, [el('b', { text: drName(d.name) }), el('small', { text: [d.dept, d.qual].filter(Boolean).join(' · ') + (Number(d.fee) > 0 ? ' · ₹' + Number(d.fee) : '') })])]));
    });
    kids.push(pick);
    return stepBox(1, 'Who would you like to see?', kids, !!(st.doctor || st.any));
  }

  function renderDateStep() {
    var off = !(st.doctor || st.any), kids = [];
    if (!off) {
      var days = el('div', { class: 'days', role: 'group', 'aria-label': 'Day' }), t0 = todayStr(), n = Math.min(st.shownDays, st.cfg.daysAhead + 1);
      for (var k = 0; k < n; k++) {
        (function (date) {
          var d = new Date(date + 'T00:00:00Z'), ok = dayAllowed(date);
          days.appendChild(el('button', { class: 'day', type: 'button', disabled: ok ? null : true, 'aria-pressed': st.date === date ? 'true' : 'false', 'aria-label': niceDate(date) + (ok ? '' : ' (not available)'), onclick: function () { pickDate(date); } },
            [el('small', { text: date === t0 ? 'Today' : DAYN[d.getUTCDay()] }), el('b', { text: String(d.getUTCDate()) }), el('span', { text: MON[d.getUTCMonth()] })]));
        })(addDays(t0, k));
      }
      kids.push(days);
      if (st.shownDays < st.cfg.daysAhead + 1) kids.push(el('p', {}, el('button', { class: 'chip', type: 'button', text: 'Show more days', onclick: function () { st.shownDays += 14; render(); } })));
      if (st.date) {
        kids.push(el('div', { class: 'slotgroup', text: st.any || st.mode === 'request' ? 'Preferred time' : 'Available times on ' + niceDate(st.date) }));
        if (st.slotsLoading) kids.push(el('div', { class: 'skel' }));
        else {
          var slots = makeSlots();
          if (!slots.length) kids.push(el('p', { class: 'alert alert--info', text: 'No free times on this day. Please pick another day' + (T.info().phone ? ' or call ' + T.info().phone : '') + '.' }));
          else {
            var box = el('div', { class: 'slots', role: 'group', 'aria-label': 'Time' });
            slots.forEach(function (s) { box.appendChild(el('button', { class: 'slot', type: 'button', 'aria-pressed': st.time === s ? 'true' : 'false', text: nice12(s), onclick: function () { pickTime(s); } })); });
            kids.push(box);
          }
        }
      }
    }
    return stepBox(2, 'Pick a day and time', kids, !!(st.date && (st.time || (st.any && st.mode === 'request'))), off);
  }

  function field(id, label, input, hint) { return el('div', { class: 'field' }, [el('label', { for: id, text: label }), input, hint ? el('span', { class: 'hint', text: hint }) : null, el('span', { class: 'hint', style: 'color:var(--bad)', 'data-err': id.replace('f-', '') })]); }
  function renderDetailsStep() {
    var off = !st.date || (st.mode === 'direct' && !st.time);
    function bind(inp, key) { inp.value = F[key]; inp.addEventListener('input', function () { F[key] = inp.value; var e = $('[data-err="' + key + '"]'); if (e) e.textContent = ''; }); return inp; }
    var child = isChild();
    var tick = el('input', { id: 'f-forchild', type: 'checkbox' }); tick.checked = child;
    tick.addEventListener('change', function () { F.forChild = tick.checked; render(); });
    var kids = [
      el('label', { class: 'check', for: 'f-forchild' }, [tick, el('span', { text: 'This appointment is for a child (under 18)' })]),
      field('f-name', child ? 'Child\'s name *' : 'Patient name *', bind(el('input', { id: 'f-name', type: 'text', autocomplete: child ? 'off' : 'name', maxlength: '150', required: true }), 'name')),
    ];
    if (child) {
      kids.push(el('div', { class: 'two' }, [
        field('f-dob', 'Date of birth *', bind(el('input', { id: 'f-dob', type: 'date', min: eighteenAgo(), max: isoToday() }), 'dob')),
        field('f-gender', 'Gender', (function () { var s2 = el('select', { id: 'f-gender' }, [['', 'Prefer not to say'], ['Female', 'Girl'], ['Male', 'Boy'], ['Other', 'Other']].map(function (o) { return el('option', { value: o[0], text: o[1] }); })); return bind(s2, 'gender'); })())]));
      kids.push(el('div', { class: 'two' }, [
        field('f-guardian', 'Parent or guardian name *', bind(el('input', { id: 'f-guardian', type: 'text', autocomplete: 'name', maxlength: '100', required: true }), 'guardian')),
        field('f-relation', 'Relationship', (function () { var s3 = el('select', { id: 'f-relation' }, [['', 'Choose'], ['Mother', 'Mother'], ['Father', 'Father'], ['Grandparent', 'Grandparent'], ['Other', 'Other']].map(function (o) { return el('option', { value: o[0], text: o[1] }); })); return bind(s3, 'relation'); })())]));
    }
    kids.push(field('f-mobile', child ? 'Parent\'s mobile number *' : 'Mobile number *', bind(el('input', { id: 'f-mobile', type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: '10-digit mobile', maxlength: '16', required: true }), 'mobile'), 'We send your confirmation to this number.'));
    if (!child) kids.push(el('div', { class: 'two' }, [
      field('f-age', 'Age', bind(el('input', { id: 'f-age', type: 'number', inputmode: 'numeric', min: '0', max: '120' }), 'age')),
      field('f-gender', 'Gender', (function () { var s = el('select', { id: 'f-gender' }, [['', 'Prefer not to say'], ['Female', 'Female'], ['Male', 'Male'], ['Other', 'Other']].map(function (o) { return el('option', { value: o[0], text: o[1] }); })); return bind(s, 'gender'); })())]));
    if (st.mode === 'request') kids.push(field('f-email', 'Email (optional)', bind(el('input', { id: 'f-email', type: 'email', autocomplete: 'email' }), 'email')));
    kids.push(field('f-reason', 'Reason for the visit (optional)', bind(el('textarea', { id: 'f-reason', maxlength: '300', placeholder: 'For example: fever for 3 days' }), 'reason')));
    kids.push(el('div', { class: 'hp', 'aria-hidden': 'true' }, [el('label', { for: 'f-hp', text: 'Leave this empty' }), bind(el('input', { id: 'f-hp', type: 'text', tabindex: '-1', autocomplete: 'off' }), 'hp')]));
    if (st.cfg.consent) {
      var cb = el('input', { id: 'f-consent', type: 'checkbox' }); cb.checked = F.consent; cb.addEventListener('change', function () { F.consent = cb.checked; var e = $('[data-err="consent"]'); if (e) e.textContent = ''; });
      kids.push(el('label', { class: 'check', for: 'f-consent' }, [cb, el('span', { text: st.cfg.consent })]), el('span', { class: 'hint', style: 'color:var(--bad)', 'data-err': 'consent' }));
    }
    return stepBox(3, 'Your details', kids, false, off);
  }

  function renderSummary() {
    var d = st.doctor, dl = el('dl');
    function row(k, v) { dl.appendChild(el('dt', { text: k })); dl.appendChild(el('dd', { class: v ? '' : 'empty', text: v || 'Not chosen yet' })); }
    row('Doctor', d ? drName(d.name) : st.any ? 'Any available doctor' : ''); row('Day', st.date ? niceDate(st.date) : ''); row('Time', st.time ? nice12(st.time) : '');
    if (d && Number(d.fee) > 0) row('Consultation fee', '₹' + Number(d.fee).toLocaleString('en-IN') + ' — pay at the hospital');
    var btn = el('button', { class: 'btn btn--gold btn--block', type: 'button', disabled: (!ready() || st.busy) ? true : null, onclick: submit, text: st.busy ? 'Please wait…' : (st.mode === 'request' ? 'Send my request' : 'Confirm appointment') });
    return el('aside', { class: 'summary', 'aria-label': 'Your appointment' }, [el('h2', { text: 'Your appointment' }), dl, btn,
      el('p', { class: 'small muted', style: 'margin:12px 0 0', text: st.mode === 'request' ? 'This is a request. Our front desk confirms the time with you.' : 'You will see a confirmation on the next screen.' })]);
  }

  function render() {
    if (!st.cfg) return;
    var keep = document.activeElement && document.activeElement.id;
    var app = T.clear($('#app'));
    app.appendChild(el('div', { class: 'book' }, [el('div', {}, [renderDoctorStep(), renderDateStep(), renderDetailsStep()]), renderSummary()]));
    if (keep) { var a = document.getElementById(keep); if (a && a.focus) a.focus(); }
  }

  // ── start ──
  T.ready.then(function () {
    T.build('book');
    var i = T.info();
    Promise.all([T.api('/booking-config'), T.api('/doctors')]).then(function (rs) {
      var c = rs[0], d = rs[1];
      if (!c.ok || !d.ok) {
        T.clear($('#app'));
        $('#app').appendChild(el('div', { class: 'step' }, [el('h2', { text: 'Online booking is not available right now' }), el('p', { class: 'muted', text: (c.error || d.error || '') }),
          i.phone ? el('p', {}, ['Please call us on ', el('a', { href: T.telHref(i.phone), text: i.phone }), ' to book your appointment.']) : null,
          i.whatsapp ? el('p', {}, el('a', { class: 'btn btn--primary', target: '_blank', rel: 'noopener', href: 'https://wa.me/' + i.whatsapp, text: 'Message us on WhatsApp' })) : null]));
        return;
      }
      st.cfg = Object.assign({ mode: 'direct', daysAhead: 30, cutoffMinutes: 120, anyDoctor: true, consent: '' }, c.data); st.mode = st.cfg.mode === 'request' ? 'request' : 'direct';
      st.doctors = d.data || [];
      if (!st.doctors.length) { $('#app').appendChild(el('div', { class: 'step' }, [el('h2', { text: 'No doctors are listed yet' }), el('p', { class: 'muted', text: 'Please call the hospital to book.' })])); return; }
      if (st.mode === 'request') $('#lede').textContent = 'Tell us who you would like to see and when. Our front desk will confirm your appointment.';
      var want = new URLSearchParams(location.search).get('doctor');
      var pre = want && st.doctors.filter(function (x) { return x.name.toLowerCase() === want.toLowerCase(); })[0];
      if (pre) pickDoctor(pre); else render();
    });
  });
})();
