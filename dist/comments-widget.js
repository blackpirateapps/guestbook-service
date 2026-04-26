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

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function fetchSection(baseUrl, sectionId) {
    var url = joinUrl(baseUrl, '/api/comment-sections?id=' + encodeURIComponent(sectionId));
    var res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch section');
    return await res.json();
  }

  async function fetchComments(baseUrl, sectionId) {
    var pageUrl = window.location.origin + window.location.pathname;
    if (!pageUrl.endsWith('/')) pageUrl += '/';
    var url = joinUrl(baseUrl, '/api/comments?section=' + encodeURIComponent(sectionId) + '&page_url=' + encodeURIComponent(pageUrl));
    var res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch comments');
    return await res.json();
  }

  async function postComment(baseUrl, payload) {
    if (!payload.page_url) {
      payload.page_url = window.location.origin + window.location.pathname;
    }
    if (!payload.page_url.endsWith('/')) payload.page_url += '/';
    var url = joinUrl(baseUrl, '/api/comments');
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      var data = {};
      try { data = await res.json(); } catch (_) {}
      throw new Error(data.error || 'Failed to post comment');
    }
    return await res.json();
  }

  async function likeComment(baseUrl, id) {
    var url = joinUrl(baseUrl, '/api/comments');
    var res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'like', id: id })
    });
    return await res.json();
  }

  function renderForm(section, parentId = null) {
    var settings = section.settings;
    var fields = settings.fields;
    
    var html = '<form class="cw-form" data-parent="' + (parentId || '') + '">';
    html += '<h3>' + (parentId ? 'Reply to Comment' : 'Leave a Comment') + '</h3>';
    
    html += '<input type="text" name="website_url_check" class="cw-honeypot" style="display:none !important;" tabindex="-1" autocomplete="off">';

    if (settings.allow_anonymous) {
      html += '<label class="cw-checkbox-label"><input type="checkbox" name="is_anonymous" class="cw-anon-check"> Comment as Anonymous</label>';
    }

    html += '<div class="cw-personal-fields">';
    if (fields.name.show) {
      html += '<div class="cw-form-group"><label>Name' + (fields.name.required ? ' *' : '') + '</label><input type="text" name="sender_name" ' + (fields.name.required ? 'required' : '') + ' data-was-required="' + fields.name.required + '"></div>';
    }
    if (fields.email.show) {
      html += '<div class="cw-form-group"><label>Email' + (fields.email.required ? ' *' : '') + '</label><input type="email" name="sender_email" ' + (fields.email.required ? 'required' : '') + ' data-was-required="' + fields.email.required + '"></div>';
    }
    if (fields.url.show) {
      html += '<div class="cw-form-group"><label>Website' + (fields.url.required ? ' *' : '') + '</label><input type="url" name="sender_url" ' + (fields.url.required ? 'required' : '') + ' data-was-required="' + fields.url.required + '"></div>';
    }
    html += '</div>';

    html += '<div class="cw-form-group"><label>Comment *</label><textarea name="comment_text" required></textarea></div>';

    html += '<div class="cw-form-actions"><button type="submit">Post Comment</button>';
    if (parentId) html += '<button type="button" class="cw-cancel-reply">Cancel</button>';
    html += '</div></form>';
    
    return html;
  }

  function renderComment(comment, allComments, section, baseUrl) {
    var name = escapeHtml(comment.sender_name || 'Anonymous');
    var text = escapeHtml(comment.comment_text);
    var date = new Date(comment.created_at).toLocaleString();
    var website = (comment.sender_url || '').trim();
    
    var nameHtml = website 
      ? '<a href="' + escapeHtml(website) + '" target="_blank" class="cw-author">' + name + '</a>'
      : '<span class="cw-author">' + name + '</span>';

    var html = '<div class="cw-comment" id="comment-' + comment.id + '">';
    html += '<div class="cw-comment-header">' + nameHtml + (comment.is_owner ? ' <span class="cw-badge">Owner</span>' : '') + ' <span class="cw-date">' + date + '</span></div>';
    html += '<div class="cw-comment-body">' + text + '</div>';
    html += '<div class="cw-comment-footer">';
    if (section.settings.allow_likes) {
      html += '<button class="cw-like-btn" data-id="' + comment.id + '">❤ ' + (comment.likes || 0) + '</button>';
    }
    html += '<button class="cw-reply-btn" data-id="' + comment.id + '">Reply</button>';
    html += '</div>';
    
    // Render children
    var children = allComments.filter(c => c.parent_id === comment.id);
    if (children.length > 0) {
      html += '<div class="cw-children">';
      children.forEach(child => {
        html += renderComment(child, allComments, section, baseUrl);
      });
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  }

  async function mount(opts) {
    var baseUrl = opts.baseUrl || defaultBaseUrl();
    var sectionId = opts.sectionId;
    var container = typeof opts.container === 'string' ? document.querySelector(opts.container) : opts.container;
    
    if (!container) return;

    // Inject base styles
    if (!document.getElementById('cw-styles')) {
      var style = document.createElement('style');
      style.id = 'cw-styles';
      style.innerHTML = `
        .cw-container { font-family: sans-serif; max-width: 800px; margin: 0 auto; color: #333; }
        .cw-comment { border-left: 2px solid #eee; padding-left: 1rem; margin-bottom: 1.5rem; }
        .cw-comment-header { font-size: 0.9rem; margin-bottom: 0.5rem; }
        .cw-author { fontWeight: 600; color: #007aff; text-decoration: none; }
        .cw-badge { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; }
        .cw-date { color: #888; margin-left: 0.5rem; }
        .cw-comment-body { line-height: 1.5; white-space: pre-wrap; }
        .cw-comment-footer { margin-top: 0.5rem; display: flex; gap: 1rem; }
        .cw-comment-footer button { background: none; border: none; color: #007aff; cursor: pointer; padding: 0; font-size: 0.85rem; }
        .cw-children { margin-top: 1rem; padding-left: 1rem; border-left: 1px solid #eee; }
        .cw-form { background: #f9f9f9; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; }
        .cw-form h3 { margin-top: 0; margin-bottom: 1rem; }
        .cw-form-group { margin-bottom: 1rem; }
        .cw-form-group label { display: block; margin-bottom: 0.3rem; font-weight: 500; font-size: 0.9rem; }
        .cw-form-group input, .cw-form-group textarea { width: 100%; padding: 0.6rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        .cw-form-group textarea { min-height: 100px; }
        .cw-checkbox-label { display: block; margin-bottom: 1rem; font-size: 0.9rem; cursor: pointer; }
        .cw-form-actions { display: flex; gap: 0.5rem; }
        .cw-form button[type="submit"] { background: #007aff; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer; font-weight: 600; }
        .cw-cancel-reply { background: #eee; color: #333; border: none; padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer; }
      `;
      document.head.appendChild(style);
    }

    async function refresh() {
      container.innerHTML = 'Loading comments...';
      try {
        var [section, data] = await Promise.all([
          fetchSection(baseUrl, sectionId),
          fetchComments(baseUrl, sectionId)
        ]);

        var html = '<div class="cw-container">';
        html += '<div id="cw-main-form-container">' + renderForm(section, null) + '</div>';
        html += '<div class="cw-comments-list">';
        
        var roots = data.comments.filter(c => !c.parent_id);
        if (roots.length === 0) {
          html += '<p>No comments yet.</p>';
        } else {
          roots.forEach(c => {
            html += renderComment(c, data.comments, section, baseUrl);
          });
        }
        
        html += '</div></div>';
        container.innerHTML = html;

        // Attach events
        container.querySelectorAll('form').forEach(form => {
          var anonCheck = form.querySelector('.cw-anon-check');
          if (anonCheck) {
            anonCheck.onchange = (e) => {
              var personalFields = form.querySelector('.cw-personal-fields');
              if (personalFields) personalFields.style.display = e.target.checked ? 'none' : 'block';
              form.querySelectorAll('.cw-personal-fields input').forEach(input => {
                input.required = e.target.checked ? false : (input.dataset.wasRequired === 'true');
              });
            };
          }

          form.onsubmit = async (e) => {
            e.preventDefault();
            var fd = new FormData(form);
            var payload = Object.fromEntries(fd.entries());
            payload.section_id = sectionId;
            payload.parent_id = form.dataset.parent || null;
            payload.is_anonymous = form.querySelector('[name="is_anonymous"]')?.checked || false;

            try {
              var res = await postComment(baseUrl, payload);
              if (res.status === 'pending') alert('Your comment is awaiting approval.');
              refresh();
            } catch (err) {
              alert(err.message);
            }
          };
        });

        container.querySelectorAll('.cw-reply-btn').forEach(btn => {
          btn.onclick = () => {
            var id = btn.dataset.id;
            var commentEl = container.querySelector('#comment-' + id);
            var existingForm = commentEl.querySelector('.cw-form');
            if (existingForm) return;
            
            var formWrapper = document.createElement('div');
            formWrapper.innerHTML = renderForm(section, id);
            commentEl.querySelector('.cw-comment-footer').after(formWrapper);
            
            formWrapper.querySelector('.cw-cancel-reply').onclick = () => formWrapper.remove();
            
            formWrapper.querySelector('form').onsubmit = async (e) => {
              e.preventDefault();
              var fd = new FormData(e.target);
              var payload = Object.fromEntries(fd.entries());
              payload.section_id = sectionId;
              payload.parent_id = id;
              payload.is_anonymous = e.target.querySelector('[name="is_anonymous"]')?.checked || false;
              
              try {
                var res = await postComment(baseUrl, payload);
                if (res.status === 'pending') alert('Your comment is awaiting approval.');
                refresh();
              } catch (err) {
                alert(err.message);
              }
            };
          };
        });

        container.querySelectorAll('.cw-like-btn').forEach(btn => {
          btn.onclick = async () => {
            var id = btn.dataset.id;
            await likeComment(baseUrl, id);
            refresh();
          };
        });

      } catch (err) {
        container.innerHTML = 'Error loading comments: ' + err.message;
      }
    }

    refresh();
  }

  window.CommentsWidget = { mount: mount };
})();
