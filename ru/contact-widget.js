/**
 * D-Art Contact Widget — модальная заявка (имя + телефон) + плавающий AI-чат.
 * @license MIT
 *
 * data-cw-start → модалка с формой (POST {apiUrl}{leadPath}, по умолчанию /lead)
 * FAB → чат с ИИ (POST {apiUrl}/chat)
 *
 * data-api-url, data-api-key, data-agent-id, data-chat-welcome, data-lead-path
 * data-cw-powered-by-url — ссылка под полем чата (например лендинг виджета)
 * data-cw-powered-by-text — подпись (по умолчанию «Powered by D-Art»)
 */
(function (global) {
  'use strict';

  var WEB_USER_KEY = 'd_art_cw_uid';
  var SESSION_AUTO_CHAT = 'd_art_cw_session_auto_opened';
  var SESSION_USER_CHAT = 'd_art_cw_session_user_opened_chat';
  var SESSION_USER_LEAD = 'd_art_cw_session_user_opened_lead';
  var AUTO_OPEN_DELAY_MS = 20000;

  var defaults = {
    zIndex: 50,
    apiUrl: '',
    agentId: 'default',
    apiKey: '',
    chatWelcome: '',
    leadPath: '/lead',
  };

  var stringsEn = {
    close: 'Close',
    fabLabel: 'Open chat',
    startTitle: 'Discuss your project',
    startLead: 'Leave your name and phone — we’ll get back to you shortly.',
    labelName: 'Your name',
    labelPhone: 'Phone',
    placeholderName: 'Jane Doe',
    placeholderPhone: '+1 234 567 8901',
    submit: 'Send request',
    sending: 'Sending…',
    errName: 'Please enter your name (at least 2 characters).',
    errPhone: 'Enter a valid phone number (e.g. +7 900 000-00-00 or international).',
    successTitle: 'Thank you!',
    successLead: 'We’ve received your request and will contact you soon.',
    successClose: 'Close',
    errNetwork: 'Could not send. Check your connection and try again.',
    errServer: 'Something went wrong. Please try again later.',
    chatTitle: 'Message us',
    chatHint: 'Write your question — the AI assistant will reply.',
    chatPlaceholder: 'Describe your project or question…',
    send: 'Send',
    typing: 'Typing…',
    chatWelcome:
      'Welcome. I’m the AI consultant for the D-art site. I can help with the site or give a rough cost estimate. How can I help?',
    errorServer: 'Server error. Try again later.',
    errorNetwork: 'Could not reach the server. Check your connection.',
  };

  var stringsRu = {
    close: 'Закрыть',
    fabLabel: 'Открыть чат',
    startTitle: 'Обсудить проект',
    startLead: 'Оставьте имя и телефон — мы свяжемся с вами в ближайшее время.',
    labelName: 'Ваше имя',
    labelPhone: 'Телефон',
    placeholderName: 'Великов Василий',
    placeholderPhone: '+7 900 000-00-00',
    submit: 'Отправить заявку',
    sending: 'Отправка…',
    errName: 'Укажите имя (не менее 2 символов).',
    errPhone: 'Введите корректный номер телефона (например +7 900 000-00-00).',
    successTitle: 'Спасибо!',
    successLead: 'Мы получили заявку и скоро свяжемся с вами.',
    successClose: 'Закрыть',
    errNetwork: 'Не удалось отправить. Проверьте подключение и попробуйте снова.',
    errServer: 'Что-то пошло не так. Попробуйте позже.',
    chatTitle: 'Напишите нам',
    chatHint: 'Задайте вопрос и вам ответит AI-консультант.',
    chatPlaceholder: 'Опишите проект или вопрос…',
    send: 'Отправить',
    typing: 'Печатает…',
    chatWelcome:
      'Приветствую вас. Это ИИ консультант сайта D-art. Могу подсказать по услугам и прикинуть стоимость. Чем помочь?',
    errorServer: 'Ошибка сервера. Попробуйте позже.',
    errorNetwork: 'Не удалось связаться с сервером. Проверьте подключение.',
  };

  var strings = stringsEn;

  function detectSiteLocale() {
    try {
      var path = (global.location && global.location.pathname) || '';
      path = String(path).replace(/\\/g, '/');
      if (/(^|\/)ru(\/|$)/.test(path)) return 'ru';
    } catch (e) {}
    return 'en';
  }

  function getStringsForLocale(loc) {
    return loc === 'ru' ? stringsRu : stringsEn;
  }

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
    var so = s.getAttribute('data-api-same-origin');
    if (so != null && so !== 'false' && so !== '0') {
      out.useApiSameOrigin = true;
    }
    var api = s.getAttribute('data-api-url') || s.getAttribute('data-api');
    if (api) out.apiUrl = api;
    var aid = s.getAttribute('data-agent-id');
    if (aid) out.agentId = aid;
    var ak = s.getAttribute('data-api-key');
    if (ak) out.apiKey = ak;
    var welcome = s.getAttribute('data-chat-welcome');
    if (welcome != null) out.chatWelcome = welcome;
    var lp = s.getAttribute('data-lead-path');
    if (lp != null && lp !== '') out.leadPath = lp;
    var pbu = s.getAttribute('data-cw-powered-by-url');
    if (pbu) out.poweredByUrl = pbu;
    var pbt = s.getAttribute('data-cw-powered-by-text');
    if (pbt != null && String(pbt).trim() !== '') out.poweredByText = String(pbt).trim();
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
    autoOpenTimerId: null,
  };

  function markUserOpenedChat() {
    try {
      sessionStorage.setItem(SESSION_USER_CHAT, '1');
    } catch (e) {}
  }

  function markUserOpenedLead() {
    try {
      sessionStorage.setItem(SESSION_USER_LEAD, '1');
    } catch (e) {}
  }

  function hasSessionAutoChat() {
    try {
      return sessionStorage.getItem(SESSION_AUTO_CHAT) === '1';
    } catch (e) {
      return false;
    }
  }

  function hasSessionUserChat() {
    try {
      return sessionStorage.getItem(SESSION_USER_CHAT) === '1';
    } catch (e) {
      return false;
    }
  }

  function hasSessionUserLead() {
    try {
      return sessionStorage.getItem(SESSION_USER_LEAD) === '1';
    } catch (e) {
      return false;
    }
  }

  function markSessionAutoChat() {
    try {
      sessionStorage.setItem(SESSION_AUTO_CHAT, '1');
    } catch (e) {}
  }

  function scheduleAutoOpenChat() {
    if (state.autoOpenTimerId != null) return;
    state.autoOpenTimerId = setTimeout(function () {
      state.autoOpenTimerId = null;
      if (state.destroyed) return;
      if (hasSessionAutoChat()) return;
      if (hasSessionUserChat()) return;
      if (hasSessionUserLead()) return;
      if (state.chatOpen || state.startOpen) return;
      markSessionAutoChat();
      setChatOpen(true, { fromAutoOpen: true });
    }, AUTO_OPEN_DELAY_MS);
  }

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

  function digitsOnly(v) {
    return String(v || '').replace(/\D/g, '');
  }

  function isPhoneValid(raw) {
    var d = digitsOnly(raw);
    if (d.length < 10 || d.length > 15) return false;
    if (d[0] === '0') return false;
    if (d.length === 11 && (d[0] === '7' || d[0] === '8')) {
      return /^[78]9\d{9}$/.test(d);
    }
    if (d.length === 10 && d[0] === '9') return true;
    if (d.length >= 10 && d.length <= 15) return true;
    return false;
  }

  function isNameValid(raw) {
    return String(raw || '').trim().length >= 2;
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

  function setChatOpen(open, opts) {
    opts = opts || {};
    state.chatOpen = !!open;
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
      if (ta && !opts.fromAutoOpen) {
        setTimeout(function () {
          ta.focus({ preventScroll: true });
        }, 0);
      }
      setTimeout(function () {
        maybeShowChatWelcome();
      }, 0);
    } else {
      panel.setAttribute('inert', '');
      panel.setAttribute('aria-modal', 'false');
      if (panel.contains(document.activeElement)) {
        fab.focus({ preventScroll: true });
      }
    }
    syncBackdrop();
  }

  function maybeShowChatWelcome() {
    if (!state.root || !state.chatOpen) return;
    var thread = getChatThreadEl();
    if (!thread) return;
    if (thread.querySelector('.cw-msg-row')) return;

    var cfg = state.config || {};
    var labels = mergeLabels(strings, cfg.labels || {});
    var fromCfg = cfg.chatWelcome != null && String(cfg.chatWelcome).trim() !== '';
    var text = fromCfg ? String(cfg.chatWelcome).trim() : String(labels.chatWelcome || '').trim();
    if (!text) return;

    renderMessage('assistant', text);
  }

  function getChatThreadEl() {
    return state.root ? state.root.querySelector('[data-cw-thread]') : null;
  }

  function scrollThreadToBottom(threadEl) {
    if (!threadEl) return;
    requestAnimationFrame(function () {
      threadEl.scrollTop = threadEl.scrollHeight;
    });
  }

  function renderMessage(role, text) {
    var thread = getChatThreadEl();
    if (!thread) return;
    var row = document.createElement('div');
    row.className = 'cw-msg-row cw-msg-row--' + role;
    var bubble = document.createElement('div');
    bubble.className = 'cw-msg cw-msg--' + role;
    bubble.textContent = text;
    row.appendChild(bubble);
    thread.appendChild(row);
    scrollThreadToBottom(thread);
  }

  function createTypingIndicator(labelText) {
    var row = document.createElement('div');
    row.className = 'cw-msg-row cw-msg-row--assistant cw-msg-row--typing';
    row.setAttribute('data-cw-typing', '');
    row.setAttribute('aria-live', 'polite');
    var inner = document.createElement('div');
    inner.className = 'cw-typing';
    inner.innerHTML =
      '<span class="cw-typing__dots" aria-hidden="true">' +
      '<span class="cw-typing__dot"></span>' +
      '<span class="cw-typing__dot"></span>' +
      '<span class="cw-typing__dot"></span>' +
      '</span>';
    var label = document.createElement('span');
    label.className = 'cw-typing__label';
    label.textContent = labelText || '…';
    inner.appendChild(label);
    row.appendChild(inner);
    return row;
  }

  function removeTypingIndicator() {
    var thread = getChatThreadEl();
    if (!thread) return;
    var el = thread.querySelector('[data-cw-typing]');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function setSendLoading(loading) {
    var root = state.root;
    if (!root) return;
    var btn = root.querySelector('.cw-chat__send');
    if (btn) btn.disabled = !!loading;
    var ta = root.querySelector('.cw-chat__input');
    if (ta) ta.disabled = !!loading;
  }

  function sendMessage() {
    var root = state.root;
    if (!root) return;
    var ta = root.querySelector('.cw-chat__input');
    var text = ta ? ta.value.trim() : '';
    if (!text) return;

    var cfg = state.config || {};
    var labels = mergeLabels(strings, cfg.labels || {});

    if (!cfg.apiUrl) {
      console.log('cw_message', text);
      renderMessage('user', text);
      if (ta) ta.value = '';
      scrollThreadToBottom(getChatThreadEl());
      return;
    }

    var userId = getOrCreateWebUserId();
    renderMessage('user', text);
    if (ta) ta.value = '';

    var thread = getChatThreadEl();
    var typingRow = createTypingIndicator(labels.typing);
    if (thread) {
      thread.appendChild(typingRow);
      scrollThreadToBottom(thread);
    }

    setSendLoading(true);

    var base = String(cfg.apiUrl).replace(/\/$/, '');
    var headers = { 'Content-Type': 'application/json' };
    if (cfg.apiKey) headers['X-API-Key'] = cfg.apiKey;

    fetch(base + '/chat', {
      method: 'POST',
      headers: headers,
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
          removeTypingIndicator();
          renderMessage(
            'assistant',
            result.data.error || labels.errorServer || 'Server error.'
          );
          setSendLoading(false);
          return;
        }
        var jitterMs = 300 + Math.floor(Math.random() * 501);
        setTimeout(function () {
          removeTypingIndicator();
          if (result.data.reply) renderMessage('assistant', result.data.reply);
          setSendLoading(false);
        }, jitterMs);
      })
      .catch(function (e) {
        console.error(e);
        removeTypingIndicator();
        renderMessage('assistant', labels.errorNetwork || 'Network error.');
        setSendLoading(false);
      });
  }

  function clearErrors(modal) {
    if (!modal) return;
    modal.querySelectorAll('.cw-field__error').forEach(function (el) {
      el.textContent = '';
    });
    modal.querySelectorAll('.cw-input').forEach(function (el) {
      el.classList.remove('cw-input--invalid');
    });
    var ge = modal.querySelector('[data-cw-form-error]');
    if (ge) {
      ge.textContent = '';
      ge.hidden = true;
    }
  }

  function resetLeadForm() {
    var modal = state.root && state.root.querySelector('.cw-start-modal');
    if (!modal) return;
    var form = modal.querySelector('#cw-start-form');
    if (form) {
      form.reset();
      form.classList.remove('cw-start-form--sent');
    }
    var fields = modal.querySelector('[data-cw-form-fields]');
    var success = modal.querySelector('[data-cw-success-banner]');
    if (fields) fields.hidden = false;
    if (success) success.hidden = true;
    clearErrors(modal);
    var submit = modal.querySelector('[data-cw-submit]');
    if (submit) {
      submit.disabled = false;
      var lab = mergeLabels(strings, (state.config && state.config.labels) || {});
      submit.textContent = lab.submit;
    }
  }

  function setStartOpen(open, opts) {
    opts = opts || {};
    state.startOpen = !!open;
    var root = state.root;
    if (!root) return;
    var modal = root.querySelector('.cw-start-modal');
    if (!modal) return;

    modal.classList.toggle('cw-start-modal--open', state.startOpen);
    modal.setAttribute('aria-hidden', state.startOpen ? 'false' : 'true');
    if (state.startOpen) {
      resetLeadForm();
      modal.removeAttribute('inert');
      modal.setAttribute('aria-modal', 'true');
      var focusEl = modal.querySelector('#cw-lead-name');
      if (focusEl && !opts.fromAuto) {
        setTimeout(function () {
          focusEl.focus({ preventScroll: true });
        }, 0);
      }
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
    var opening = !state.chatOpen;
    if (opening) {
      markUserOpenedChat();
    }
    setChatOpen(!state.chatOpen);
  }

  function openStartModal() {
    if (state.destroyed) return;
    if (state.chatOpen) {
      setChatOpen(false);
    }
    markUserOpenedLead();
    setStartOpen(true);
  }

  function openChatPanel() {
    if (state.startOpen) setStartOpen(false);
    markUserOpenedChat();
    setChatOpen(true);
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
      '<form id="cw-start-form" class="cw-start-form" novalidate>' +
      '<div data-cw-form-fields class="cw-start-form__fields">' +
      '<p class="cw-start-modal__title" id="cw-start-title">' +
      escapeHtml(labels.startTitle) +
      '</p>' +
      '<p class="cw-start-modal__lead">' +
      escapeHtml(labels.startLead) +
      '</p>' +
      '<div class="cw-field">' +
      '<label class="cw-field__label" for="cw-lead-name">' +
      escapeHtml(labels.labelName) +
      '</label>' +
      '<input type="text" id="cw-lead-name" name="name" class="cw-input" autocomplete="name" maxlength="120" placeholder="' +
      escapeAttr(labels.placeholderName) +
      '" />' +
      '<span class="cw-field__error" id="cw-err-name" role="alert"></span>' +
      '</div>' +
      '<div class="cw-field">' +
      '<label class="cw-field__label" for="cw-lead-phone">' +
      escapeHtml(labels.labelPhone) +
      '</label>' +
      '<input type="tel" id="cw-lead-phone" name="phone" class="cw-input" autocomplete="tel" inputmode="tel" placeholder="' +
      escapeAttr(labels.placeholderPhone) +
      '" />' +
      '<span class="cw-field__error" id="cw-err-phone" role="alert"></span>' +
      '</div>' +
      '<p class="cw-form__error" data-cw-form-error hidden role="alert"></p>' +
      '<button type="submit" class="btn btn-glass cw-start-form__submit" data-cw-submit>' +
      escapeHtml(labels.submit) +
      '</button>' +
      '</div>' +
      '<div class="cw-start-form__success" data-cw-success-banner hidden>' +
      '<div class="cw-start-form__success-icon" aria-hidden="true">✓</div>' +
      '<p class="cw-start-form__success-title">' +
      escapeHtml(labels.successTitle) +
      '</p>' +
      '<p class="cw-start-form__success-lead">' +
      escapeHtml(labels.successLead) +
      '</p>' +
      '<button type="button" class="btn btn-glass cw-start-form__success-btn" data-cw-success-close>' +
      escapeHtml(labels.successClose) +
      '</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '<div class="cw-chat glass" id="cw-chat-panel" role="dialog" aria-modal="false" aria-hidden="true" inert aria-label="' +
      escapeAttr(labels.chatTitle) +
      '">' +
      '<button type="button" class="cw-chat__close" title="' +
      escapeAttr(labels.close) +
      '" aria-label="' +
      escapeAttr(labels.close) +
      '"><span aria-hidden="true">×</span></button>' +
      '<p class="cw-chat__title">' +
      escapeHtml(labels.chatTitle) +
      '</p>' +
      '<p class="cw-chat__hint">' +
      escapeHtml(labels.chatHint) +
      '</p>' +
      '<div class="cw-chat__thread" data-cw-thread role="log" aria-live="polite" aria-relevant="additions"></div>' +
      '<label class="cw-chat__label visually-hidden" for="cw-chat-input">' +
      escapeHtml(labels.chatPlaceholder) +
      '</label>' +
      '<textarea id="cw-chat-input" class="cw-chat__input" rows="3" placeholder="' +
      escapeAttr(labels.chatPlaceholder) +
      '"></textarea>' +
      '<button type="button" class="btn btn-glass cw-chat__send">' +
      escapeHtml(labels.send) +
      '</button>' +
      (cfg.poweredByUrl
        ? '<p class="cw-chat__powered">' +
          '<a href="' +
          escapeAttr(cfg.poweredByUrl) +
          '" target="_blank" rel="noopener noreferrer" class="cw-chat__powered-link">' +
          escapeHtml(cfg.poweredByText || 'Powered by D-Art') +
          '</a></p>'
        : '') +
      '</div>' +
      '<button type="button" class="cw-fab glass" aria-label="' +
      escapeAttr(labels.fabLabel) +
      '" aria-expanded="false" aria-controls="cw-chat-panel" aria-haspopup="dialog">' +
      '<span class="cw-fab__ping" aria-hidden="true"></span>' +
      '<span class="cw-fab__icon" aria-hidden="true">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
      '</svg>' +
      '</span>' +
      '</button>';

    return root;
  }

  function submitLead(e) {
    e.preventDefault();
    var root = state.root;
    if (!root) return;
    var modal = root.querySelector('.cw-start-modal');
    var cfg = state.config || {};
    var labels = mergeLabels(strings, cfg.labels || {});
    var nameEl = root.querySelector('#cw-lead-name');
    var phoneEl = root.querySelector('#cw-lead-phone');
    var submitBtn = root.querySelector('[data-cw-submit]');
    var name = nameEl ? nameEl.value : '';
    var phone = phoneEl ? phoneEl.value : '';

    clearErrors(modal);

    var ok = true;
    if (!isNameValid(name)) {
      ok = false;
      var ne = root.querySelector('#cw-err-name');
      if (ne) ne.textContent = labels.errName;
      if (nameEl) nameEl.classList.add('cw-input--invalid');
    }
    if (!isPhoneValid(phone)) {
      ok = false;
      var pe = root.querySelector('#cw-err-phone');
      if (pe) pe.textContent = labels.errPhone;
      if (phoneEl) phoneEl.classList.add('cw-input--invalid');
    }
    if (!ok) return;

    var payload = {
      name: String(name).trim(),
      phone: String(phone).trim(),
      source: 'web',
    };

    if (!cfg.apiUrl) {
      console.log('cw_lead', payload);
      showSuccessState();
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = labels.sending;
    }

    var base = String(cfg.apiUrl).replace(/\/$/, '');
    var path = cfg.leadPath != null ? String(cfg.leadPath) : '/lead';
    if (path.charAt(0) !== '/') path = '/' + path;
    var headers = { 'Content-Type': 'application/json' };
    if (cfg.apiKey) headers['X-API-Key'] = cfg.apiKey;

    fetch(base + path, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = labels.submit;
        }
        if (!result.ok) {
          var ge = root.querySelector('[data-cw-form-error]');
          if (ge) {
            ge.textContent = (result.data && result.data.error) || labels.errServer;
            ge.hidden = false;
          }
          return;
        }
        showSuccessState();
      })
      .catch(function (err) {
        console.error(err);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = labels.submit;
        }
        var ge = root.querySelector('[data-cw-form-error]');
        if (ge) {
          ge.textContent = labels.errNetwork;
          ge.hidden = false;
        }
      });
  }

  function showSuccessState() {
    var root = state.root;
    if (!root) return;
    var form = root.querySelector('#cw-start-form');
    var fields = root.querySelector('[data-cw-form-fields]');
    var success = root.querySelector('[data-cw-success-banner]');
    if (form) form.classList.add('cw-start-form--sent');
    if (fields) fields.hidden = true;
    if (success) success.hidden = false;
  }

  function init(userOptions) {
    if (state.root) return state;

    var scriptCfg = readScriptConfig();
    var opt = userOptions || {};
    var cfg = {};
    for (var dk in defaults) cfg[dk] = defaults[dk];
    for (var sk in scriptCfg) cfg[sk] = scriptCfg[sk];
    for (var ok in opt) if (opt[ok] !== undefined) cfg[ok] = opt[ok];

    var winApi = global.__DART_CW_API_URL__;
    if (winApi && typeof winApi === 'string' && winApi.trim() && !cfg.apiUrl) {
      cfg.apiUrl = winApi.trim();
    }

    if (
      cfg.useApiSameOrigin &&
      (!cfg.apiUrl || !String(cfg.apiUrl).trim()) &&
      global.location &&
      global.location.origin &&
      /^https?:/.test(global.location.protocol)
    ) {
      cfg.apiUrl = String(global.location.origin).replace(/\/$/, '');
    }

    var labels = mergeLabels(getStringsForLocale(detectSiteLocale()), opt.labels || {});
    strings = labels;

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

    state.root.querySelector('#cw-start-form').addEventListener('submit', submitLead);

    state.root.querySelector('#cw-lead-name').addEventListener('input', function () {
      var ne = state.root.querySelector('#cw-err-name');
      if (ne) ne.textContent = '';
      state.root.querySelector('#cw-lead-name').classList.remove('cw-input--invalid');
    });
    state.root.querySelector('#cw-lead-phone').addEventListener('input', function () {
      var pe = state.root.querySelector('#cw-err-phone');
      if (pe) pe.textContent = '';
      state.root.querySelector('#cw-lead-phone').classList.remove('cw-input--invalid');
    });

    state.root.querySelector('[data-cw-success-close]').addEventListener('click', function () {
      setStartOpen(false);
    });

    state.root.querySelector('.cw-chat__send').addEventListener('click', function () {
      sendMessage();
    });

    state.root.querySelector('.cw-chat__input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
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

    scheduleAutoOpenChat();

    return state;
  }

  function destroy() {
    state.destroyed = true;
    if (state.autoOpenTimerId != null) {
      clearTimeout(state.autoOpenTimerId);
      state.autoOpenTimerId = null;
    }
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

  global.openChat = openChatPanel;
  global.openLeadModal = openStartModal;

  global.ContactWidget = {
    init: init,
    destroy: destroy,
    openStartProject: openStartModal,
    openLeadModal: openStartModal,
    openChatPanel: openChatPanel,
    closeAll: closeAll,
    version: '3.3.0',
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
