/* Customer-side real-case flow: mandate acceptance and approval of demand letters.
   Stays invisible unless the database flag real_cases_enabled is true.
   Uses the Supabase client created by the Kundenkonto page. All text is inserted with textContent. */
(function () {
  if (typeof client === 'undefined') return;
  var box = document.getElementById('realCases');
  if (!box) return;

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  function euro(cents) {
    return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  }
  function note(parent, text, isError) {
    var old = parent.querySelector('.rc-msg');
    if (old) old.remove();
    var p = el('p', text, 'rc-msg ' + (isError ? 'muted' : 'status'));
    parent.append(p);
  }
  function confirmRow(text) {
    var wrap = el('div', undefined, 'check');
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'rc-' + Math.random().toString(36).slice(2);
    var lab = el('label', text);
    lab.htmlFor = cb.id;
    wrap.append(cb, lab);
    return { wrap: wrap, cb: cb };
  }

  async function mandateBlock(c, card) {
    var res = await client.from('mandates').select('id,status,accepted_at,document_version').eq('case_id', c.id).order('created_at', { ascending: false }).limit(1);
    var m = res.data && res.data[0];
    var sec = el('div', undefined, 'case');
    sec.append(el('h4', 'Auftrag'));
    if (m && m.status === 'ACTIVE') {
      sec.append(el('p', 'Auftrag erteilt am ' + new Date(m.accepted_at).toLocaleString('de-DE') + ' (Version ' + m.document_version + ').'));
      var rev = el('button', 'Auftrag widerrufen');
      rev.onclick = async function () {
        if (!window.confirm('Auftrag wirklich beenden? Offene Schreiben werden abgebrochen.')) return;
        var r = await client.rpc('forderbar_revoke_mandate', { p_case_id: c.id });
        if (r.error) note(sec, 'Das hat nicht geklappt: ' + r.error.message, true); else render();
      };
      sec.append(rev);
    } else if (c.status === 'APPROVED') {
      var t = await client.rpc('forderbar_get_mandate_template');
      var tpl = t.data && t.data[0];
      if (!tpl) {
        sec.append(el('p', 'Der Auftragstext wird gerade vorbereitet. Bitte schau später noch einmal vorbei.', 'muted'));
      } else {
        sec.append(el('h5', tpl.title));
        var txt = el('div', tpl.body);
        txt.style.cssText = 'white-space:pre-wrap;background:#f4f8fa;border:1px solid #d7e5ec;border-radius:10px;padding:14px;max-height:320px;overflow:auto;font-size:14px';
        sec.append(txt);
        var row = confirmRow('Ich habe den Auftrag gelesen und erteile ihn Forderbar für diesen Fall.');
        var btn = el('button', 'Auftrag erteilen');
        btn.disabled = true;
        row.cb.addEventListener('change', function () { btn.disabled = !row.cb.checked; });
        btn.onclick = async function () {
          btn.disabled = true;
          var r = await client.rpc('forderbar_accept_mandate', { p_case_id: c.id, p_version: tpl.version, p_confirmed: row.cb.checked });
          if (r.error) { note(sec, 'Das hat nicht geklappt: ' + r.error.message, true); btn.disabled = false; } else render();
        };
        sec.append(row.wrap, btn);
      }
    } else {
      sec.append(el('p', 'Ein Auftrag ist erst möglich, nachdem Forderbar deinen Fall angenommen hat.', 'muted'));
    }
    card.append(sec);
    return m && m.status === 'ACTIVE';
  }

  var STATUS = {
    PENDING_CUSTOMER_APPROVAL: 'wartet auf deine Freigabe',
    CUSTOMER_APPROVED: 'von dir freigegeben, wird geprüft',
    RELEASED: 'zum Versand freigegeben',
    SENT: 'versendet',
    FAILED: 'Versand fehlgeschlagen',
    CANCELLED: 'abgebrochen'
  };

  async function lettersBlock(c, card) {
    var res = await client.from('demand_letters').select('id,kind,channel,recipient_name,subject,body,deadline,status,sent_at').eq('case_id', c.id).order('created_at', { ascending: false });
    var rows = res.data || [];
    if (!rows.length) return;
    var sec = el('div', undefined, 'case');
    sec.append(el('h4', 'Schreiben an die Gegenpartei'));
    rows.forEach(function (l) {
      var item = el('div');
      item.style.cssText = 'border-top:1px solid #dfe6ea;padding-top:12px;margin-top:12px';
      item.append(el('p', l.subject + ' · an ' + l.recipient_name + ' · ' + (STATUS[l.status] || l.status), 'status'));
      if (l.status === 'PENDING_CUSTOMER_APPROVAL') {
        var txt = el('div', l.body);
        txt.style.cssText = 'white-space:pre-wrap;background:#f4f8fa;border:1px solid #d7e5ec;border-radius:10px;padding:14px;font-size:14px';
        item.append(txt);
        var row = confirmRow('Ich habe das Schreiben gelesen. Es darf in meinem Namen an die Gegenpartei gesendet werden.');
        var ok = el('button', 'Schreiben freigeben');
        var no = el('button', 'Ablehnen');
        ok.disabled = true;
        row.cb.addEventListener('change', function () { ok.disabled = !row.cb.checked; });
        ok.onclick = async function () {
          ok.disabled = true;
          var r = await client.rpc('forderbar_customer_approve_demand', { p_letter_id: l.id, p_confirmed: row.cb.checked });
          if (r.error) { note(item, 'Das hat nicht geklappt: ' + r.error.message, true); ok.disabled = false; } else render();
        };
        no.onclick = async function () {
          var r = await client.rpc('forderbar_customer_reject_demand', { p_letter_id: l.id });
          if (r.error) note(item, 'Das hat nicht geklappt: ' + r.error.message, true); else render();
        };
        item.append(row.wrap, ok, no);
      }
      sec.append(item);
    });
    card.append(sec);
  }

  var busy = false;
  async function render() {
    if (busy) return;
    busy = true;
    try {
      var u = await client.auth.getUser();
      var user = u.data && u.data.user;
      if (!user) { box.classList.add('hidden'); return; }
      var on = await client.rpc('forderbar_real_cases_enabled');
      if (on.error || on.data !== true) { box.classList.add('hidden'); return; }
      var cs = await client.from('cases').select('id,category,amount_cents,debtor_name,status').eq('synthetic', false).order('created_at', { ascending: false });
      box.replaceChildren();
      box.classList.remove('hidden');
      box.append(el('h2', 'Deine Fälle'));
      if (cs.error) { box.append(el('p', 'Fälle konnten nicht geladen werden.', 'muted')); return; }
      if (!cs.data || !cs.data.length) { box.append(el('p', 'Noch keine angenommenen Fälle.', 'muted')); return; }
      for (var i = 0; i < cs.data.length; i++) {
        var c = cs.data[i];
        var card = el('article', undefined, 'case');
        card.append(el('h3', c.category + ' · ' + euro(c.amount_cents)));
        card.append(el('p', 'Gegenpartei: ' + c.debtor_name));
        card.append(el('p', 'Status: ' + c.status, 'status'));
        var active = await mandateBlock(c, card);
        if (active) await lettersBlock(c, card);
        box.append(card);
      }
    } finally { busy = false; }
  }

  client.auth.onAuthStateChange(function () { setTimeout(render, 0); });
  render();
})();
