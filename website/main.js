/* ============================================================
   Olympia IDE 官网交互 — vanilla JS，无框架
   模块：滚动淡入(D6) / 导航增强(D1) / 编辑器演示(D2)
         能力切换(D3) / 下载提示(D4) / 数字滚动(D5)
   全部遵循 prefers-reduced-motion：不自动打字、不做计数动画。
   ============================================================ */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- D6 · 滚动淡入（保留原有行为）+ 分组 45-80ms 错开 ---------- */
  const revealEls = $$('.reveal');
  {
    // 同一父容器内的兄弟元素依次错开，跨组重置
    const groups = new Map();
    revealEls.forEach((el) => {
      const i = groups.get(el.parentElement) || 0;
      groups.set(el.parentElement, i + 1);
      el.style.setProperty('--reveal-delay', `${Math.min(i * 55, 440)}ms`);
    });

    if (reduced || !('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('in'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
      revealEls.forEach((el) => io.observe(el));
      // 兜底：3 秒后仍未入场的元素直接显示，避免任何环境下内容丢失
      setTimeout(() => revealEls.forEach((el) => el.classList.add('in')), 3000);
    }
  }

  /* ---------- D1 · 导航：滚动加深 + 当前 section 高亮 ---------- */
  const nav = $('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const navMap = new Map();
  $$('.nav-links a[href^="#"]').forEach((a) => {
    if (a.classList.contains('nav-cta')) return; // CTA 不参与高亮
    const id = a.getAttribute('href').slice(1);
    if (id) navMap.set(id, a);
  });
  if ('IntersectionObserver' in window && navMap.size) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navMap.forEach((a) => a.classList.remove('active'));
        const link = navMap.get(e.target.id);
        if (link) link.classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    navMap.forEach((_link, id) => {
      const sec = document.getElementById(id);
      if (sec) spy.observe(sec);
    });
  }

  /* ---------- D2 · 首屏仿真编辑器「演示模式」 ---------- */
  const demoBtn = $('#demo-btn');
  const editorOl = $('#editor-code');
  const runner = $('#runner');
  const stRun = $('#st-run');

  if (demoBtn && editorOl && runner && stRun) {
    const snap = {
      code: editorOl.innerHTML,
      runner: runner.innerHTML,
      status: stRun.textContent,
    };
    const DEMO_LINES = [
      '#include <bits/stdc++.h>',
      'using namespace std;',
      '',
      'int main() {',
      '    long long a, b;',
      '    cin >> a >> b;',
      "    cout << a + b << '\\n';",
      '    return 0;',
      '}',
    ];
    const DEMO_ROWS = [
      '<span class="verdict">AC</span> 样例 1 · 2 ms',
      '<span class="verdict">AC</span> 样例 2 · 3 ms',
      '<span class="verdict">AC</span> 样例 3 · 2 ms',
    ];
    let demoState = 'idle'; // idle | running | done
    let demoTimers = [];

    const clearTimers = () => { demoTimers.forEach(clearTimeout); demoTimers = []; };
    const setLabel = (t) => { demoBtn.textContent = t; };

    const resetDemo = () => {
      clearTimers();
      editorOl.innerHTML = snap.code;
      runner.innerHTML = snap.runner;
      stRun.textContent = snap.status;
      demoState = 'idle';
      setLabel('▶ 看演示');
      demoBtn.setAttribute('aria-pressed', 'false');
    };

    const finishResults = () => {
      stRun.textContent = snap.status;
      demoState = 'done';
      setLabel('↺ 重放');
    };

    const afterTyping = (instant) => {
      stRun.textContent = '评测中…';
      const cases = $('#runner-cases');
      const foot = runner.querySelector('.runner-foot');
      if (instant) {
        DEMO_ROWS.forEach((html) => {
          const div = document.createElement('div');
          div.className = 'case pass';
          div.innerHTML = html;
          cases.appendChild(div);
        });
        if (foot) foot.hidden = false;
        finishResults();
        return;
      }
      const reveal = (k) => {
        if (k >= DEMO_ROWS.length) {
          if (foot) foot.hidden = false;
          finishResults();
          return;
        }
        const div = document.createElement('div');
        div.className = 'case pass pop';
        div.innerHTML = DEMO_ROWS[k];
        cases.appendChild(div);
        demoTimers.push(setTimeout(() => reveal(k + 1), 280));
      };
      demoTimers.push(setTimeout(() => reveal(0), 380));
    };

    const runDemo = () => {
      clearTimers();
      demoState = 'running';
      setLabel('■ 停止');
      demoBtn.setAttribute('aria-pressed', 'true');
      editorOl.innerHTML = '';
      runner.innerHTML =
        '<div class="runner-head">测试结果</div>' +
        '<div class="runner-cases" id="runner-cases"></div>' +
        '<div class="runner-foot" hidden>✔ 全部通过 · 最长 3 ms / 1.8 MB</div>';
      stRun.textContent = '演示中…';

      if (reduced) {
        // 减少动态效果：不逐字打字，直接呈现终态
        DEMO_LINES.forEach((t) => {
          const li = document.createElement('li');
          li.textContent = t;
          editorOl.appendChild(li);
        });
        afterTyping(true);
        return;
      }

      const typeLine = (idx) => {
        if (demoState !== 'running') return;
        if (idx >= DEMO_LINES.length) { afterTyping(false); return; }
        const li = document.createElement('li');
        editorOl.appendChild(li);
        const line = DEMO_LINES[idx];
        let i = 0;
        const tick = () => {
          if (demoState !== 'running') return;
          i += 1;
          li.textContent = line.slice(0, i);
          if (i < line.length) {
            demoTimers.push(setTimeout(tick, 22));
          } else {
            demoTimers.push(setTimeout(() => typeLine(idx + 1), 90));
          }
        };
        tick();
      };
      typeLine(0);
    };

    demoBtn.addEventListener('click', () => {
      if (demoState === 'running') resetDemo();
      else runDemo(); // idle 或 done（重放）都重新开始
    });
  }

  /* ---------- D3 · 能力切换（roving tabindex + 方向键） ---------- */
  const capTabs = $$('.cap-tab');
  const capPanels = $$('.cap-panel');
  if (capTabs.length && capPanels.length === capTabs.length) {
    const select = (i, focus) => {
      capTabs.forEach((t, k) => {
        const on = k === i;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        capPanels[k].classList.toggle('active', on);
      });
      if (focus) capTabs[i].focus();
    };
    capTabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i, false));
      t.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % capTabs.length;
        else if (e.key === 'ArrowLeft') n = (i - 1 + capTabs.length) % capTabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = capTabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });
  }

  /* ---------- D4 · 下载按钮瞬时提示 ---------- */
  const dlBtn = $('#dl-btn');
  const dlToast = $('#dl-toast');
  if (dlBtn && dlToast) {
    let toastTimer;
    dlBtn.addEventListener('click', () => {
      dlToast.textContent = '已开始下载 · 正在校验 Gitee 链接…';
      dlToast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => dlToast.classList.remove('show'), 2800);
    });
  }

  /* ---------- D5 · 数字滚动（进入视口 count-up） ---------- */
  const statNums = $$('.stat-num');
  const animateNum = (el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const suffix = el.dataset.suffix || '';
    if (reduced || target === 0) {
      el.textContent = target + suffix;
      return;
    }
    const t0 = performance.now();
    const dur = 900;
    const frame = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  if ('IntersectionObserver' in window && !reduced) {
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { animateNum(e.target); io2.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    statNums.forEach((n) => io2.observe(n));
  } else {
    statNums.forEach(animateNum);
  }
})();
