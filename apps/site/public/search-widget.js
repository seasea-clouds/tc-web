/**
 * search-widget.js — Standalone search widget (no React dependency)
 *
 * Loaded by CF Pages Middleware on proxied blog/portal pages.
 * Supports 48 languages via search-widget-translations.json.
 * Keyboard navigation: arrows, Enter, Escape.
 *
 * ── Architecture ────────────────────────────────────────────
 * 1. On load, fetch /search-widget-translations.json (from site domain)
 * 2. Detect locale from URL pathname
 * 3. On search button click → open native <dialog>
 * 4. On input → debounce 200ms → fetch /search-index-{locale}.json → filter → render
 *
 * ── Lifecycle ───────────────────────────────────────────────
 * - idle:      loaded, waiting for user
 * - loading:   fetching translations or search-index
 * - searching: user typed, filtering results
 * - results:   showing results, keyboard nav active
 * - closed:    dialog closed, back to idle
 */
(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  var state = { locale: 'en', t: null, index: null, results: [], activeIdx: -1 };

  // ── Translations cache ─────────────────────────────────────
  var translationsPromise = null;
  function getTranslations() {
    if (!translationsPromise) {
      translationsPromise = fetch('/search-widget-translations.json')
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .catch(function () { return null; });
    }
    return translationsPromise;
  }

  // ── Index cache ────────────────────────────────────────────
  var indexCache = {};
  function loadIndex(locale) {
    if (indexCache[locale] !== undefined) return Promise.resolve(indexCache[locale]);
    return fetch('/search-index-' + locale + '.json')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) { indexCache[locale] = data; return data; })
      .catch(function () { indexCache[locale] = null; return null; });
  }

  // ── Locale detection ───────────────────────────────────────
  function detectLocale() {
    var m = location.pathname.match(/^\/([a-z]{2})(\/|$)/);
    return m ? m[1] : 'en';
  }

  // ── DOM helpers ────────────────────────────────────────────
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'className') e.className = attrs[k];
      else if (k === 'style') e.style.cssText = attrs[k];
      else if (k === 'htmlFor') e.setAttribute('for', attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    var _children = Array.isArray(children) ? children : (children ? [String(children)] : []);
    _children.forEach(function (c) {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    });
    return e;
  }

  function qs(s) { return document.querySelector(s); }

  // ── SVG icon (inline, matches original lucide style) ──────
  function searchSvg() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', '11');
    circle.setAttribute('cy', '11');
    circle.setAttribute('r', '8');
    svg.appendChild(circle);
    var line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', '21');
    line.setAttribute('y1', '21');
    line.setAttribute('x2', '16.65');
    line.setAttribute('y2', '16.65');
    svg.appendChild(line);
    return svg;
  }

  function iconSvg(path, color) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', color || '#999');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', path);
    svg.appendChild(p);
    return svg;
  }

  // ── Build dialog DOM ──────────────────────────────────────
  function buildDialog(t) {
    var dialog = el('dialog', {
      className: 'sw-dialog',
      style: 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:transparent;border:none;overflow:visible;padding:0;margin:0;max-width:none;max-height:none;'
    });

    // Backdrop
    var backdrop = el('div', {
      className: 'sw-backdrop',
      style: 'position:fixed;inset:0;z-index:1;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);'
    });
    backdrop.addEventListener('click', function () { dialog.close(); });

    // Panel
    var panel = el('div', {
      className: 'sw-panel',
      style: 'position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:2;width:92%;max-width:640px;max-height:calc(100vh - 9rem);background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
    });

    // Input row
    var inputRow = el('div', {
      style: 'display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid #eef0f2;'
    });
    inputRow.appendChild(searchSvg());
    var input = el('input', {
      type: 'text',
      placeholder: t.placeholder || 'Search...',
      className: 'sw-input',
      style: 'flex:1;border:none;outline:none;font-size:15px;background:transparent;color:#1a1a2e;line-height:1.5;'
    });
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    inputRow.appendChild(input);

    var clearBtn = el('button', {
      className: 'sw-clear',
      style: 'display:none;padding:3px 6px;background:#f0f0f0;border:none;border-radius:4px;cursor:pointer;font-size:12px;color:#888;line-height:1;',
      'aria-label': 'Clear'
    }, '✕');
    inputRow.appendChild(clearBtn);

    var escHint = el('kbd', {
      style: 'font-size:11px;color:#999;background:#f5f5f5;padding:1px 6px 2px;border-radius:3px;border:1px solid #ddd;display:none;font-family:inherit;'
    }, 'ESC');
    inputRow.appendChild(escHint);
    panel.appendChild(inputRow);

    // Results area
    var resultsEl = el('div', {
      className: 'sw-results',
      style: 'flex:1;overflow-y:auto;min-height:60px;'
    });
    panel.appendChild(resultsEl);

    dialog.appendChild(backdrop);
    dialog.appendChild(panel);
    document.body.appendChild(dialog);

    return { dialog: dialog, input: input, resultsEl: resultsEl, clearBtn: clearBtn, escHint: escHint };
  }

  // ── Render results ────────────────────────────────────────
  function renderResults(results, resultsEl, locale, t) {
    resultsEl.innerHTML = '';

    if (!results || results.length === 0) {
      resultsEl.appendChild(el('div', {
        style: 'padding:48px 20px;text-align:center;color:#999;font-size:14px;line-height:1.6;'
      }, [t.noResults || 'No results found.']));
      return;
    }

    // Group by type
    var grouped = {};
    results.forEach(function (r) {
      if (!grouped[r.type]) grouped[r.type] = [];
      grouped[r.type].push(r);
    });

    var order = ['service', 'blog', 'faq'];
    var typeLabels = t.types || { service: 'Services', blog: 'Insights', faq: 'FAQ' };

    order.forEach(function (type) {
      var items = grouped[type];
      if (!items || items.length === 0) return;

      var label = typeLabels[type] || type;
      resultsEl.appendChild(el('div', {
        style: 'padding:10px 18px 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#aaa;'
      }, [label + ' (' + items.length + ')']));

      items.forEach(function (item, i) {
        var link = el('a', {
          href: '/' + locale + item.href,
          style: 'display:flex;align-items:flex-start;gap:10px;padding:10px 18px;text-decoration:none;color:inherit;cursor:pointer;transition:background .12s;border:none;background:transparent;width:100%;box-sizing:border-box;text-align:left;font-family:inherit;',
          'data-type': type,
          'data-idx': i,
          onmouseenter: function () { this.style.background = '#f5f6ff'; },
          onmouseleave: function () { this.style.background = ''; },
        });

        // Type icon — matches original SearchModal icons
        var iconPaths = {
          service: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
          blog: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
          faq: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01',
        };
        var iconColors = { service: '#3b82f6', blog: '#d4af37', faq: '#999' };
        var icon = iconSvg(iconPaths[item.type] || '', iconColors[item.type] || '#999');
        var iconWrap = el('span', { style: 'margin-top:1px;flex-shrink:0;display:flex;' }, [icon]);

        var textWrap = el('div', { style: 'min-width:0;flex:1;' });
        textWrap.appendChild(el('div', {
          style: 'font-size:14px;font-weight:500;color:#1a1a2e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
        }, [item.title]));
        if (item.desc) {
          textWrap.appendChild(el('div', {
            style: 'font-size:12px;color:#999;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
          }, [item.desc]));
        }

        link.appendChild(iconWrap);
        link.appendChild(textWrap);
        link.addEventListener('click', function () {
          setTimeout(function () { closeDialog(); }, 50);
        });

        resultsEl.appendChild(link);
      });
    });
  }

  // ── Keyboard navigation ──────────────────────────────────
  function navigateResults(dir, resultsEl) {
    var links = resultsEl.querySelectorAll('a[data-type]');
    if (links.length === 0) return;

    // Remove current highlight
    if (state.activeIdx >= 0 && state.activeIdx < links.length) {
      links[state.activeIdx].style.background = '';
    }

    state.activeIdx = Math.max(-1, Math.min(state.activeIdx + dir, links.length - 1));

    if (state.activeIdx >= 0) {
      links[state.activeIdx].style.background = '#edefff';
      links[state.activeIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  function selectActive() {
    var activeLink = qs('.sw-results a[data-type]');
    if (state.activeIdx >= 0) {
      activeLink = document.querySelectorAll('.sw-results a[data-type]')[state.activeIdx];
    }
    if (activeLink) activeLink.click();
  }

  // ── Dialog controls ───────────────────────────────────────
  var currentDialog = null;
  function closeDialog() {
    if (currentDialog && currentDialog.open) currentDialog.close();
    state.results = [];
    state.activeIdx = -1;
  }

  // ── Main init ─────────────────────────────────────────────
  function init() {
    if (qs('.sw-dialog')) return; // already init'd

    state.locale = detectLocale();

    getTranslations().then(function (trans) {
      try {
      state.t = (trans && trans[state.locale]) ? trans[state.locale] : null;
      if (!state.t) {
        // Fallback to English
        state.t = { placeholder: 'Search...', noResults: 'No results found.', hint: 'Type to search', types: { service: 'Services', blog: 'Insights', faq: 'FAQ' } };
      }

      var comp = buildDialog(state.t);
      currentDialog = comp.dialog;
      var input = comp.input;
      var resultsEl = comp.resultsEl;
      var clearBtn = comp.clearBtn;
      var escHint = comp.escHint;

      // Close handler
      comp.dialog.addEventListener('close', function () {
        document.body.style.overflow = '';
        input.value = '';
        resultsEl.innerHTML = '';
        state.results = [];
        state.activeIdx = -1;
      });

      // Input — debounced
      var debounceTimer;
      function onInput() {
        var q = input.value;
        clearBtn.style.display = q ? 'block' : 'none';
        escHint.style.display = q ? 'inline' : 'none';
        state.activeIdx = -1;

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          if (!q.trim()) {
            resultsEl.innerHTML = '<div style="padding:48px 20px;text-align:center;color:#999;font-size:14px;">' + (state.t.hint || 'Type to search') + '</div>';
            return;
          }
          var q2 = q;
          loadIndex(state.locale).then(function (idx) {
            if (!idx || input.value !== q2) return;
            state.index = idx;
            var results = searchItems(q2, idx);
            state.results = results;
            renderResults(results, resultsEl, state.locale, state.t);
          });
        }, 200);
      }

      input.addEventListener('input', onInput);

      // Keyboard
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          if (input.value) {
            input.value = '';
            onInput();
            e.preventDefault();
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigateResults(1, resultsEl);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigateResults(-1, resultsEl);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          selectActive();
        }
      });

      clearBtn.addEventListener('click', function () {
        input.value = '';
        input.focus();
        onInput();
      });

      // ── Bind search button ─────────────────────
      function bindBtn() {
        var btn = qs('button[aria-label="Search"], button[aria-label="搜索"]');
        if (!btn) { setTimeout(bindBtn, 500); return; }
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (comp.dialog.open) return;
          resultsEl.innerHTML = '<div style="padding:48px 20px;text-align:center;color:#999;font-size:14px;">' + (state.t.hint || 'Type to search') + '</div>';
          comp.dialog.showModal();
          document.body.style.overflow = 'hidden';
          setTimeout(function () { input.focus(); }, 100);
        }, true);
      }
      bindBtn();

      // Preload index
      loadIndex(state.locale);
    } catch(e) { console.error('SW init error:', e); }
    });
  }

  // ── Search logic ──────────────────────────────────────────
  function searchItems(query, index) {
    if (!index || !query.trim()) return [];
    var q = query.toLowerCase().trim();
    var results = [];

    var sections = [
      { type: 'service', items: index.services || [] },
      { type: 'blog', items: index.blog || [] },
      { type: 'faq', items: index.faq || [] },
    ];

    sections.forEach(function (section) {
      section.items.forEach(function (item) {
        if (item.searchable && item.searchable.indexOf(q) !== -1) {
          results.push({ type: section.type, title: item.title, desc: item.desc || '', href: item.href });
        }
      });
    });

    return results;
  }

  // ── Boot ──────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
