window.__ModuleLoader__.load({
  id: '@local/kimi-balance',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'kimi-balance';
    const ROUTE = 'api/kimi.balance';
    const POLL_MS = 60000;

    // --- shared stores -----------------------------------------------------
    function createStore(initial) {
      return {
        state: initial,
        listeners: new Set(),
        set(next) {
          this.state = next;
          for (const fn of [...this.listeners]) fn();
        },
        subscribe(fn) {
          this.listeners.add(fn);
          return () => this.listeners.delete(fn);
        },
      };
    }

    const usage = createStore({ status: 'loading' });
    const popover = createStore({ open: false, anchor: null });

    function mapResponse(body) {
      if (body && body.ok) return { status: 'ok', ...body };
      if (body && body.reason === 'no-key') return { status: 'no-key', key: body.key };
      return { status: 'error', detail: body || null };
    }

    async function refresh() {
      try {
        const res = await fetch(ROUTE, { headers: { accept: 'application/json' } });
        usage.set(mapResponse(await res.json().catch(() => null)));
      } catch {
        usage.set({ status: 'error', detail: null });
      }
    }

    async function saveKey(apiKey) {
      const res = await fetch(ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const body = await res.json().catch(() => null);
      usage.set(mapResponse(body));
      return body;
    }

    async function saveRegion(region) {
      const baseUrl = region === 'cn' ? 'https://api.kimi.com/coding' : 'https://api.kimi.ai/coding';
      const res = await fetch(ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ baseUrl }),
      });
      return await res.json().catch(() => null);
    }

    // --- helpers -----------------------------------------------------------
    function pct(ratio) {
      const n = Number(ratio);
      return (Number.isFinite(n) ? Math.round(n * 100) : 0) + '%';
    }

    function levelColor(ratio) {
      const n = Number(ratio) || 0;
      if (n >= 0.8) return 'var(--dsw-alias-state-error-primary)';
      if (n >= 0.5) return 'var(--dsw-alias-state-warn-primary)';
      return 'var(--dsw-alias-state-success-primary)';
    }

    function dot(color) {
      return h('span', {
        'aria-hidden': true,
        style: { width: 6, height: 6, borderRadius: '50%', flex: '0 0 auto', background: color },
      });
    }

    function bar(ratio) {
      const n = Math.max(0, Math.min(1, Number(ratio) || 0));
      return h('div', {
        'aria-hidden': true,
        style: {
          height: 4, borderRadius: 2, overflow: 'hidden',
          margin: '2px 0 6px',
          background: 'var(--dsw-alias-bg-layer-2)',
        },
      }, h('div', {
        style: { width: (n * 100).toFixed(1) + '%', height: '100%', background: levelColor(n) },
      }));
    }

    function row(label, value) {
      return h('div', {
        style: { display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, lineHeight: '20px' },
      },
        h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, label),
        h('span', { style: { color: 'var(--dsw-alias-label-primary)', fontWeight: 500 } }, value));
    }

    function localTime(iso) {
      const d = new Date(iso);
      return Number.isNaN(d.getTime())
        ? '—'
        : d.toLocaleString(undefined, { hour12: false });
    }

    const btnStyle = {
      padding: '4px 12px',
      borderRadius: 8,
      border: '1px solid var(--dsw-alias-border-l2)',
      background: 'var(--dsw-alias-bg-layer-1)',
      color: 'var(--dsw-alias-label-primary)',
      fontSize: 12,
      cursor: 'pointer',
    };

    return {
      inject: ['slots', 'locale', 'timer'],
      apply(ctx) {
        ctx.locale.register(NS, 'en', {
          loading: 'Kimi: loading…',
          noKey: 'Kimi: click to set the API key',
          error: 'Kimi usage unavailable',
          balance: 'Kimi Code usage',
          h5: '5-hour window',
          d7: 'Weekly window',
          used: 'Used',
          remaining: 'Left',
          resets: 'Resets',
          updated: 'Updated',
          clickHint: 'Click for details',
          apiKey: 'API key',
          keyPlaceholder: 'sk-…',
          save: 'Save',
          clear: 'Remove key',
          close: 'Close',
          keySet: 'Key saved',
          keyCleared: 'Key removed',
          keySource: 'Key source',
          sourceConfig: 'plugin config',
          sourceNone: 'not set',
          saveFailed: 'Could not save the key',
          account: 'Account',
          region: 'Region',
          oversea: 'Oversea',
          overseaHint: 'all countries except China',
          cn: 'CN',
          cnHint: 'China',
          regionSaved: 'Region saved, refreshing…',
          regionFailed: 'Could not save the region',
        });
        ctx.locale.register(NS, 'ru', {
          loading: 'Kimi: загрузка…',
          noKey: 'Kimi: нажмите, чтобы задать API-ключ',
          error: 'Данные Kimi недоступны',
          balance: 'Лимиты Kimi Code',
          h5: 'Окно 5 часов',
          d7: 'Окно недели',
          used: 'Использовано',
          remaining: 'Осталось',
          resets: 'Сброс',
          updated: 'Обновлено',
          clickHint: 'Нажмите для подробностей',
          apiKey: 'API-ключ',
          keyPlaceholder: 'sk-…',
          save: 'Сохранить',
          clear: 'Удалить ключ',
          close: 'Закрыть',
          keySet: 'Ключ сохранён',
          keyCleared: 'Ключ удалён',
          keySource: 'Источник ключа',
          sourceConfig: 'конфиг плагина',
          sourceNone: 'не задан',
          saveFailed: 'Не удалось сохранить ключ',
          account: 'Аккаунт',
          region: 'Регион',
          oversea: 'Oversea',
          overseaHint: 'все страны, кроме Китая',
          cn: 'CN',
          cnHint: 'Китай',
          regionSaved: 'Регион сохранён, обновляю…',
          regionFailed: 'Не удалось сохранить регион',
        });
        const t = ctx.locale.bind(NS);

        function useLocale() {
          React.useSyncExternalStore(
            (fn) => ctx.locale.subscribe(fn),
            () => ctx.locale.getSnapshot().revision,
          );
        }

        function useStore(store) {
          return React.useSyncExternalStore(
            (fn) => store.subscribe(fn),
            () => store.state,
          );
        }

        function windowSection(title, win, counts) {
          if (!win && !counts) return null;
          const ratio = win ? win.ratio : (counts && counts.limit ? counts.used / counts.limit : 0);
          const resetIso = (win && win.reset) || (counts && counts.reset) || '';
          return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            h('div', {
              style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, lineHeight: '18px' },
            },
              h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, title),
              h('span', { style: { color: levelColor(ratio), fontWeight: 600 } }, pct(ratio))),
            bar(ratio),
            counts && row(t('used') + ' / ' + t('remaining'), counts.used + ' / ' + counts.remaining + ' (' + counts.limit + ')'),
            resetIso && row(t('resets'), localTime(resetIso)));
        }

        // --- badge in the composer dock -----------------------------------
        function UsageBadge() {
          useLocale();
          const state = useStore(usage);

          React.useEffect(() => {
            refresh();
            const stop = ctx.timer.interval(refresh, POLL_MS);
            return () => stop();
          }, []);

          let color = 'var(--dsw-alias-state-idle-primary)';
          let text = t('loading');
          let title = t('balance') + ' — ' + t('clickHint');
          if (state.status === 'ok') {
            const r5 = state.h5 ? state.h5.ratio : 0;
            const r7 = state.d7 ? state.d7.ratio : 0;
            color = levelColor(Math.max(r5, r7));
            text = 'Kimi 5h ' + pct(r5) + ' · 7d ' + pct(r7);
          } else if (state.status === 'no-key') {
            color = 'var(--dsw-alias-state-warn-primary)';
            text = t('noKey');
          } else if (state.status === 'error') {
            color = 'var(--dsw-alias-state-error-primary)';
            text = t('error');
            if (state.detail) title += ': ' + (state.detail.message || state.detail.reason || 'HTTP ' + state.detail.status);
          }

          return h('button', {
            type: 'button',
            title,
            onClick: (e) => {
              refresh();
              const rect = e.currentTarget.getBoundingClientRect();
              popover.set({ open: true, anchor: { left: rect.left, top: rect.top } });
            },
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 10px',
              borderRadius: 999,
              background: 'var(--dsw-alias-bg-layer-1)',
              border: '1px solid var(--dsw-alias-border-l1)',
              color: 'var(--dsw-alias-label-secondary)',
              fontSize: 12,
              lineHeight: '18px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            },
          }, dot(color), h('span', null, text));
        }

        // --- details popover in the frame overlay --------------------------
        function UsagePopover() {
          useLocale();
          const view = useStore(popover);
          const state = useStore(usage);
          const [value, setValue] = React.useState('');
          const [busy, setBusy] = React.useState(false);
          const [regionBusy, setRegionBusy] = React.useState(false);
          const [notice, setNotice] = React.useState('');

          const close = React.useCallback(() => {
            popover.set({ open: false, anchor: null });
            setNotice('');
            setValue('');
          }, []);

          React.useEffect(() => {
            if (!view.open) return undefined;
            const onKey = (e) => { if (e.key === 'Escape') close(); };
            window.addEventListener('keydown', onKey);
            return () => window.removeEventListener('keydown', onKey);
          }, [view.open, close]);

          if (!view.open) return null;

          const anchor = view.anchor || { left: 24, top: 200 };
          const left = Math.max(8, Math.min(anchor.left, window.innerWidth - 296));
          const bottom = Math.max(8, window.innerHeight - anchor.top + 8);

          async function onSave() {
            setBusy(true);
            setNotice('');
            try {
              const body = await saveKey(value);
              if (body && body.ok) { setValue(''); setNotice(t('keySet')); }
              else if (body && body.reason === 'no-key') { setValue(''); setNotice(t('keyCleared')); }
              else setNotice(t('saveFailed'));
            } catch {
              setNotice(t('saveFailed'));
            }
            setBusy(false);
          }

          async function onClear() {
            setBusy(true);
            setNotice('');
            try {
              await saveKey('');
              setNotice(t('keyCleared'));
            } catch {
              setNotice(t('saveFailed'));
            }
            setBusy(false);
          }

          const keyInfo = state.key || null;
          const keySource = !keyInfo || !keyInfo.configured
            ? t('sourceNone')
            : keyInfo.source === 'config' ? t('sourceConfig') : String(keyInfo.source || 'store');
          const account = state.user && (state.user.nickname || state.user.level)
            ? (state.user.nickname + (state.user.level ? ' · ' + state.user.level : ''))
            : null;
          const currentRegion = state.region === 'cn' ? 'cn' : 'oversea';

          async function onRegion(next) {
            if (next === currentRegion || regionBusy) return;
            setRegionBusy(true);
            setNotice('');
            try {
              const body = await saveRegion(next);
              if (body && body.ok) {
                usage.set({ ...usage.state, region: next });
                setNotice(t('regionSaved'));
                setTimeout(refresh, 1500);
              } else {
                setNotice(t('regionFailed'));
              }
            } catch {
              setNotice(t('regionFailed'));
            }
            setRegionBusy(false);
          }

          function regionOption(id, label, hint) {
            const active = currentRegion === id;
            return h('label', {
              style: {
                flex: 1, display: 'flex', flexDirection: 'column', gap: 2,
                padding: '6px 10px', borderRadius: 8,
                cursor: regionBusy ? 'default' : 'pointer',
                opacity: regionBusy ? 0.6 : 1,
                border: '1px solid ' + (active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l1)'),
                background: active ? 'var(--dsw-alias-bg-layer-2)' : 'var(--dsw-alias-bg-layer-1)',
              },
            },
              h('span', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } },
                h('input', {
                  type: 'radio',
                  name: 'kimi-region',
                  checked: active,
                  disabled: regionBusy,
                  onChange: () => onRegion(id),
                  style: { accentColor: '#ffffff' },
                }),
                label),
              h('span', { style: { fontSize: 10, lineHeight: '13px', marginTop: 4, color: 'var(--dsw-alias-label-secondary)' } }, hint));
          }

          return h(React.Fragment, null,
            h('div', {
              onClick: close,
              style: { position: 'fixed', inset: 0, zIndex: 999, pointerEvents: 'auto' },
            }),
            h('div', {
              role: 'dialog',
              'aria-label': t('balance'),
              style: {
                position: 'fixed',
                pointerEvents: 'auto',
                left,
                bottom,
                zIndex: 1000,
                width: 288,
                padding: 12,
                borderRadius: 12,
                background: '#2C2C31',
                border: '1px solid var(--dsw-alias-border-l1)',
                color: 'var(--dsw-alias-label-primary)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              },
            },
              h('div', {
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
              },
                h('span', { style: { fontSize: 13, fontWeight: 600 } }, t('balance')),
                h('button', {
                  type: 'button', onClick: close, title: t('close'),
                  style: { ...btnStyle, padding: '2px 8px', border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-secondary)' },
                }, '✕')),

              account && row(t('account'), account),
              state.status === 'ok' && h(React.Fragment, null,
                windowSection(t('h5'), state.h5, state.h5Counts),
                windowSection(t('d7'), state.d7, state.d7Counts),
                row(t('updated'), localTime(state.updatedAt))),
              state.status === 'loading' && h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, t('loading')),
              state.status === 'error' && h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' } },
                t('error') + (state.detail && state.detail.message ? ': ' + state.detail.message : '')),

              h('div', { style: { height: 1, background: 'var(--dsw-alias-border-l1)' } }),
              h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, t('region')),
              h('div', {
                role: 'radiogroup',
                'aria-label': t('region'),
                style: { display: 'flex', gap: 8 },
              },
                regionOption('oversea', t('oversea'), t('overseaHint')),
                regionOption('cn', t('cn'), t('cnHint'))),
              row(t('keySource'), keySource),
              h('input', {
                type: 'password',
                value,
                placeholder: t('keyPlaceholder'),
                'aria-label': t('apiKey'),
                onChange: (e) => setValue(e.target.value),
                style: {
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #ffffff',
                  background: 'var(--dsw-alias-bg-layer-1)',
                  color: 'var(--dsw-alias-label-primary)',
                  fontSize: 12,
                  outline: 'none',
                },
              }),
              h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
                keyInfo && keyInfo.configured && keyInfo.writable && h('button', {
                  type: 'button', onClick: onClear, disabled: busy, style: btnStyle,
                }, t('clear')),
                h('button', {
                  type: 'button', onClick: onSave, disabled: busy || !value.trim(),
                  style: { ...btnStyle, opacity: busy || !value.trim() ? 0.5 : 1 },
                }, t('save'))),
              notice && h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, notice)));
        }

        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'kimi-balance',
          order: 5,
          label: () => t('balance'),
        }, UsageBadge));

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'kimi-balance-popover',
          order: 5,
          label: () => t('balance'),
        }, UsagePopover));
      },
    };
  },
});
