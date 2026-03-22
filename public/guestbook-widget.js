(function () {
  function defaultBaseUrl() {
    try {
      var currentScript = document.currentScript;
      if (currentScript && currentScript.src) return new URL(currentScript.src).origin;
    } catch (_) {}
    return window.location.origin;
  }

  function joinUrl(baseUrl, path) {
    try {
      return new URL(path, baseUrl).toString();
    } catch (_) {
      return (baseUrl || '').replace(/\/+$/, '') + path;
    }
  }

  async function fetchEntries(opts) {
    if (!opts || !opts.username) throw new Error('username is required');
    var baseUrl = opts.baseUrl || defaultBaseUrl();
    var url = joinUrl(baseUrl, '/api/entries?user=' + encodeURIComponent(opts.username));
    var res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error('Failed to fetch entries');
    return await res.json();
  }

  async function submitEntry(opts) {
    if (!opts || !opts.owner_username) throw new Error('owner_username is required');
    if (!opts.sender_name) throw new Error('sender_name is required');
    if (!opts.message) throw new Error('message is required');

    var baseUrl = opts.baseUrl || defaultBaseUrl();
    var url = joinUrl(baseUrl, '/api/entries');
    var body = {
      owner_username: opts.owner_username,
      sender_name: opts.sender_name,
      sender_website: opts.sender_website || '',
      message: opts.message,
      parent_id: opts.parent_id || null,
      is_private: !!opts.is_private,
      bot_field: opts.bot_field || ''
    };

    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      var data = {};
      try { data = await res.json(); } catch (_) {}
      throw new Error(data.error || 'Failed to submit entry');
    }
    return await res.json();
  }

  async function submitReply(opts) {
    if (!opts || !opts.owner_username) throw new Error('owner_username is required');
    if (!opts.parent_id) throw new Error('parent_id is required');
    if (!opts.sender_name) throw new Error('sender_name is required');
    if (!opts.message) throw new Error('message is required');

    return await submitEntry({
      baseUrl: opts.baseUrl,
      owner_username: opts.owner_username,
      sender_name: opts.sender_name,
      sender_website: opts.sender_website || '',
      message: opts.message,
      parent_id: opts.parent_id,
      is_private: false,
      bot_field: opts.bot_field || ''
    });
  }

  async function likeEntry(opts) {
    if (!opts || !opts.id) throw new Error('id is required');
    var baseUrl = opts.baseUrl || defaultBaseUrl();
    var url = joinUrl(baseUrl, '/api/entries');

    var res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'like', id: opts.id })
    });
    if (!res.ok) {
      var data = {};
      try { data = await res.json(); } catch (_) {}
      throw new Error(data.error || 'Failed to like entry');
    }
    return await res.json();
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderDefaultEntry(entry) {
    var name = escapeHtml(entry.sender_name || 'Anonymous');
    var date = entry.created_at ? new Date(entry.created_at).toLocaleString() : '';
    var message = escapeHtml(entry.message || '');
    var website = (entry.sender_website || '').trim();

    var nameHtml = website
      ? '<a class="gbw-author" href="' + escapeHtml(website) + '" target="_blank" rel="noopener noreferrer">' + name + '</a>'
      : '<span class="gbw-author">' + name + '</span>';

    return (
      '<article class="gbw-entry">' +
        '<header class="gbw-entry-header">' +
          '<div class="gbw-entry-title">' +
            nameHtml +
            '<span class="gbw-date"> - ' + escapeHtml(date) + '</span>' +
          '</div>' +
        '</header>' +
        '<div class="gbw-entry-body">' + message + '</div>' +
      '</article>'
    );
  }

  async function mount(opts) {
    if (!opts || !opts.username) throw new Error('username is required');
    var container = typeof opts.container === 'string' ? document.querySelector(opts.container) : opts.container;
    if (!container) throw new Error('container not found');

    var entries = await fetchEntries({ baseUrl: opts.baseUrl, username: opts.username });
    var renderEntry = typeof opts.renderEntry === 'function' ? opts.renderEntry : renderDefaultEntry;
    container.innerHTML = entries.map(renderEntry).join('');
    return entries;
  }

  window.GuestbookWidget = {
    fetchEntries: fetchEntries,
    submitEntry: submitEntry,
    submitReply: submitReply,
    likeEntry: likeEntry,
    mount: mount
  };
})();
