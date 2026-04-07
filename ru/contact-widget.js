/**
 * D-Art Contact Widget — start-project modal (Telegram vs chat) + floating chat composer.
 * @license MIT
 *
 * <link rel="stylesheet" href="contact-widget.css" />
 * <script src="contact-widget.js" data-telegram-url="https://t.me/your_handle" defer></script>
 *
 * AI backend (optional): add data-api-url="https://your-api.example.com" and data-agent-id="default"
 * (или передайте apiUrl / agentId в ContactWidget.init({ ... })).
 * POST {apiUrl}/chat с телом { message, userId, agentId, source: "web" } → { reply }.
 *
 * Mark CTAs: <button type="button" class="btn btn-glass" data-cw-start>Start a project</button>
 */
(function (global) {
  'use strict';

  var WEB_USER_KEY = 'd_art_cw_uid';

  var defaults = {
    telegramUrl: 'https://t.me/',
    zIndex: 50,
    apiUrl: '',
    agentId: 'default',
  };

  var strings = {
    fabLabel: 'Open chat',
    startTitle: 'How should we connect?',
    startLead: 'Pick Telegram for async messages, or chat here — we’ll respond shortly.',
    telegram: 'Telegram',
    openChat: 'Chat on site',
    close: 'Close',
    chatTitle: 'Message us',
    chatHint: 'Write your question — a consultant will pick this up soon.',
    chatPlaceholder: 'Describe your project or question…',
    send: 'Send',
  };

  function prefersReducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function getWidgetScriptEl() {
    var s = document.currentScript;
    if (s && s.getAttribute) return s;
    if (document.querySelector) {
      return document.querySelector('script[src*="contact-widget"]');
    }
    return null;
  }

  function readScriptConfig() {
    var s = getWidgetScriptEl();
    if (!s || !s.getAttribute) return {};
    var out = {};
    var url = s.getAttribute('data-telegram-url') || s.getAttribute('data-telegram');
    if (url) out.telegramUrl = url;
    var api = s.getAttribute('data-api-url') || s.getAttribute('data-api');
    if (api) out.apiUrl = api;
    var aid = s.getAttribute('data-agent-id');
    if (aid) out.agentId = aid;
    return out;
  }

  function getOrCreateWebUserId() {
    try {
      var id = global.localStorage && localStorage.getItem(WEB_USER_KEY);
      if (id) return id;
      id =
        'web_' +
        (global.crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now()) + '_' + Math.random().toString(36).slice(2));
      localStorage.setItem(WEB_USER_KEY, id);
      return id;
    } catch (e) {
      return 'web_anon_' + String(Date.now());
    }
  }

  var state = {
    root: null,
    chatOpen: false,
    startOpen: false,
    destroyed: false,
    config: null,
    onDocClick: null,
  };

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function mergeLabels(base, custom) {
    if (!custom) return base;
    var o = {};
    for (var k in base) o[k] = base[k];
    for (var k2 in custom) if (custom[k2] != null) o[k2] = custom[k2];
    return o;
  }

  function syncBackdrop() {
    var root = state.root;
    if (!root) return;
    var backdrop = root.querySelector('[data-cw-backdrop]');
    if (!backdrop) return;
    var vis = state.chatOpen || state.startOpen;
    backdrop.classList.toggle('cw-backdrop--visible', vis);
    backdrop.setAttribute('aria-hidden', vis ? 'false' : 'true');
  }

  function setChatOpen(open) {
    var next = !!open;
    if (next && !state.chatOpen) {
      console.log('Chat opened');
    }
    state.chatOpen = next;
    var root = state.root;
    if (!root) return;
    var fab = root.querySelector('.cw-fab');
    var panel = root.querySelector('.cw-chat');
    if (!fab || !panel) return;

    fab.setAttribute('aria-expanded', state.chatOpen ? 'true' : 'false');
    panel.classList.toggle('cw-chat--open', state.chatOpen);
    panel.setAttribute('aria-hidden', state.chatOpen ? 'false' : 'true');
    if (state.chatOpen) {
      panel.removeAttribute('inert');
      panel.setAttribute('aria-modal', 'true');
      var ta = panel.querySelector('.cw-chat__input');
      if (ta) {
        setTimeout(function () {
          ta.focus({ preventScroll: true });
        }, 0);
      }
    } else {
      panel.setAttribute('inert', '');
      panel.setAttribute('aria-modal', 'false');
      if (panel.contains(document.activeElement)) {
        fab.focus({ preventScroll: true });
      }
    }
    syncBackdrop();
  }

  function setStartOpen(open) {
    state.startOpen = !!open;
    var root = state.root;
    if (!root) return;
    var modal = root.querySelector('.cw-start-modal');
    if (!modal) return;

    modal.classList.toggle('cw-start-modal--open', state.startOpen);
    modal.setAttribute('aria-hidden', state.startOpen ? 'false' : 'true');
    if (state.startOpen) {
      modal.removeAttribute('inert');
      modal.setAttribute('aria-modal', 'true');
      var first = modal.querySelector('a, button');
      if (first) first.focus({ preventScroll: true });
    } else {
      modal.setAttribute('inert', '');
      modal.setAttribute('aria-modal', 'false');
    }
    syncBackdrop();
  }

  function closeAll() {
    setStartOpen(false);
    setChatOpen(false);
  }

  function toggleChatFromFab() {
    if (state.startOpen) {
      setStartOpen(false);
    }
    setChatOpen(!state.chatOpen);
  }

  function openStartModal() {
    if (state.destroyed) return;
    if (state.chatOpen) {
      setChatOpen(false);
    }
    setStartOpen(true);
  }

  function appendThreadMessage(role, text) {
    var root = state.root;
    if (!root) return;
    var thread = root.querySelector('[data-cw-thread]');
    if (!thread) return;
    var row = document.createElement('div');
    row.className = 'cw-msg cw-msg--' + role;
    row.textContent = text;
    thread.appendChild(row);
    thread.scrollTop = thread.scrollHeight;
  }

  function setSendLoading(loading) {
    var root = state.root;
    if (!root) return;
    var btn = root.querySelector('.cw-chat__send');
    if (btn) btn.disabled = !!loading;
    var ta = root.querySelector('.cw-chat__input');
    if (ta) ta.disabled = !!loading;
  }

  function onSendMessage() {
    var root = state.root;
    if (!root) return;
    var ta = root.querySelector('.cw-chat__input');
    var text = ta ? ta.value.trim() : '';
    if (!text) return;

    var cfg = state.config || {};
    if (!cfg.apiUrl) {
      console.log('cw_message', text);
      if (ta) ta.value = '';
      return;
    }

    var userId = getOrCreateWebUserId();
    appendThreadMessage('user', text);
    if (ta) ta.value = '';

    setSendLoading(true);
    var base = String(cfg.apiUrl).replace(/\/$/, '');
    fetch(base + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        userId: userId,
        agentId: cfg.agentId || 'default',
        source: 'web',
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          appendThreadMessage('assistant', result.data.error || 'Server error. Try again later.');
          return;
        }
        if (result.data.reply) appendThreadMessage('assistant', result.data.reply);
      })
      .catch(function (e) {
        console.error(e);
        appendThreadMessage('assistant', 'Could not reach the server. Check your connection.');
      })
      .then(function () {
        setSendLoading(false);
      });
  }

  function onKeydown(e) {
    if (e.key !== 'Escape') return;
    if (state.chatOpen) {
      setChatOpen(false);
      return;
    }
    if (state.startOpen) {
      setStartOpen(false);
    }
  }

  function buildDOM(cfg, labels) {
    var root = document.createElement('div');
    root.id = 'cw-root';
    root.className = 'cw';
    root.style.setProperty('--cw-z', String(cfg.zIndex));

    root.innerHTML =
      '<div class="cw-backdrop" data-cw-backdrop aria-hidden="true"></div>' +
      '<div class="cw-start-modal glass" id="cw-start-modal" role="dialog" aria-modal="false" aria-hidden="true" inert aria-labelledby="cw-start-title">' +
      '<button type="button" class="cw-start-modal__close" aria-label="' +
      escapeAttr(labels.close) +
      '"><span aria-hidden="true">×</span></button>' +
      '<p class="cw-start-modal__title" id="cw-start-title">' +
      escapeHtml(labels.startTitle) +
      '</p>' +
      '<p class="cw-start-modal__lead">' +
      escapeHtml(labels.startLead) +
      '</p>' +
      '<div class="cw-start-modal__actions">' +
      '<a class="btn btn-glass cw-start-modal__tg" href="' +
      escapeAttr(cfg.telegramUrl) +
      '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(labels.telegram) +
      '</a>' +
      '<button type="button" class="btn btn-glass cw-start-modal__chat" data-cw-open-chat-from-start>' +
      escapeHtml(labels.openChat) +
      '</button>' +
      '</div>' +
      '</div>' +
      '<div class="cw-chat glass" id="cw-chat-panel" role="dialog" aria-modal="false" aria-hidden="true" inert aria-label="' +
      escapeAttr(labels.chatTitle) +
      '">' +
      '<button type="button" class="cw-chat__close" aria-label="' +
      escapeAttr(labels.close) +
      '"><span aria-hidden="true">×</span></button>' +
      '<p class="cw-chat__title">' +
      escapeHtml(labels.chatTitle) +
      '</p>' +
      '<p class="cw-chat__hint">' +
      escapeHtml(labels.chatHint) +
      '</p>' +
      '<div class="cw-chat__thread" data-cw-thread aria-live="polite" aria-relevant="additions"></div>' +
      '<label class="cw-chat__label visually-hidden" for="cw-chat-input">' +
      escapeHtml(labels.chatPlaceholder) +
      '</label>' +
      '<textarea id="cw-chat-input" class="cw-chat__input" rows="4" placeholder="' +
      escapeAttr(labels.chatPlaceholder) +
      '"></textarea>' +
      '<button type="button" class="btn btn-glass cw-chat__send">' +
      escapeHtml(labels.send) +
      '</button>' +
      '</div>' +
      '<button type="button" class="cw-fab glass" aria-label="' +
      escapeAttr(labels.fabLabel) +
      '" aria-expanded="false" aria-controls="cw-chat-panel" aria-haspopup="dialog">' +
      '<span class="cw-fab__icon" aria-hidden="true">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
      '</svg>' +
      '</span>' +
      '</button>';

    return root;
  }

  function init(userOptions) {
    if (state.root) return state;

    var scriptCfg = readScriptConfig();
    var opt = userOptions || {};
    var cfg = {};
    for (var dk in defaults) cfg[dk] = defaults[dk];
    for (var sk in scriptCfg) cfg[sk] = scriptCfg[sk];
    for (var ok in opt) if (opt[ok] !== undefined) cfg[ok] = opt[ok];

    var labels = mergeLabels(strings, opt.labels);

    state.config = cfg;
    state.root = buildDOM(cfg, labels);
    document.body.appendChild(state.root);

    if (prefersReducedMotion()) {
      state.root.classList.add('cw--reduce-motion');
    }

    var fab = state.root.querySelector('.cw-fab');
    var backdrop = state.root.querySelector('[data-cw-backdrop]');

    fab.addEventListener('click', function () {
      toggleChatFromFab();
    });

    backdrop.addEventListener('click', function () {
      closeAll();
    });

    state.root.querySelector('.cw-chat__close').addEventListener('click', function () {
      setChatOpen(false);
    });

    state.root.querySelector('.cw-start-modal__close').addEventListener('click', function () {
      setStartOpen(false);
    });

    state.root.querySelector('[data-cw-open-chat-from-start]').addEventListener('click', function () {
      setStartOpen(false);
      setChatOpen(true);
    });

    state.root.querySelector('.cw-chat__send').addEventListener('click', onSendMessage);

    state.root.querySelector('.cw-chat__input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onSendMessage();
      }
    });

    state.onDocClick = function (e) {
      var el = e.target.closest && e.target.closest('[data-cw-start]');
      if (!el) return;
      e.preventDefault();
      openStartModal();
    };
    document.addEventListener('click', state.onDocClick, false);

    document.addEventListener('keydown', onKeydown);

    return state;
  }

  function destroy() {
    state.destroyed = true;
    document.removeEventListener('keydown', onKeydown);
    if (state.onDocClick) {
      document.removeEventListener('click', state.onDocClick, false);
      state.onDocClick = null;
    }
    if (state.root && state.root.parentNode) {
      state.root.parentNode.removeChild(state.root);
    }
    state.root = null;
    state.config = null;
  }

  function openChatPanel() {
    if (state.startOpen) setStartOpen(false);
    setChatOpen(true);
  }

  global.openChat = openChatPanel;

  global.ContactWidget = {
    init: init,
    destroy: destroy,
    openStartProject: openStartModal,
    openChatPanel: openChatPanel,
    closeAll: closeAll,
    version: '2.1.0',
  };

  function boot() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
      return;
    }
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
