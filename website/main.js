// Olympia IDE 官网交互：移动菜单 + 复制文件名 + 滚动动效。无外部依赖。

(function () {
	'use strict';

	var toggle = document.getElementById('nav-toggle');
	var nav = document.getElementById('site-nav');

	if (toggle && nav) {
		toggle.addEventListener('click', function () {
			var open = nav.classList.toggle('open');
			toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		});
		nav.addEventListener('click', function (event) {
			if (event.target.tagName === 'A') {
				nav.classList.remove('open');
				toggle.setAttribute('aria-expanded', 'false');
			}
		});
	}

	function flash(button, text) {
		var original = button.textContent;
		button.textContent = text;
		button.disabled = true;
		window.setTimeout(function () {
			button.textContent = original;
			button.disabled = false;
		}, 1600);
	}

	function writeText(text, done) {
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(text).then(done, function () { done(false); });
			return;
		}
		var field = document.createElement('textarea');
		field.value = text;
		field.setAttribute('readonly', '');
		field.style.position = 'fixed';
		field.style.opacity = '0';
		document.body.appendChild(field);
		field.select();
		var ok = false;
		try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
		document.body.removeChild(field);
		done(ok);
	}

	document.addEventListener('click', function (event) {
		var button = event.target.closest('.copy');
		if (!button) { return; }
		event.preventDefault();
		writeText(button.getAttribute('data-copy') || '', function (ok) {
			flash(button, ok ? '已复制' : '请手动复制');
		});
	});
})();

/* ---------------------------------------------------------------------------
   滚动动效。全部是渐进增强：
   - 不支持 IntersectionObserver，或用户开了「减少动效」，就一个类都不加，页面保持静态。
   - motion 类是唯一的总开关，CSS 里的初始隐藏态都挂在它下面，
     所以 JS 出问题时最多是「没有动画」，不会出现「内容一直不显示」。
   --------------------------------------------------------------------------- */

(function () {
	'use strict';

	if (!('IntersectionObserver' in window)) { return; }
	if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }

	document.documentElement.classList.add('motion');

	/* 同一组里的第几个，用来错开进场时机 */
	function positionInGroup(el) {
		var parent = el.parentNode;
		if (!parent) { return 0; }
		var index = 0;
		for (var i = 0; i < parent.children.length; i++) {
			if (parent.children[i] === el) { break; }
			if (parent.children[i].classList && parent.children[i].classList.contains('reveal')) { index++; }
		}
		return Math.min(index, 6);
	}

	var targets = document.querySelectorAll(
		'main > section > h2,' +
		'main > section > .section-lede,' +
		'.grid > article,' +
		'.cols > div,' +
		'.strip > .step,' +
		'.editions > .edition,' +
		'.install,' +
		'.faq > details,' +
		'.table-wrap,' +
		'.cta .btn'
	);

	if (targets.length) {
		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (!entry.isIntersecting) { return; }
				entry.target.style.transitionDelay = (positionInGroup(entry.target) * 70) + 'ms';
				entry.target.classList.add('is-in');
				observer.unobserve(entry.target);
			});
		}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

		Array.prototype.forEach.call(targets, function (el) {
			el.classList.add('reveal');
			observer.observe(el);
		});
	}

	/* 顶部阅读进度条 */
	var bar = document.createElement('div');
	bar.className = 'read-progress';
	document.body.appendChild(bar);

	var pending = false;
	function paintProgress() {
		var root = document.documentElement;
		var scrollable = root.scrollHeight - root.clientHeight;
		var ratio = scrollable > 0 ? root.scrollTop / scrollable : 0;
		bar.style.width = (Math.min(Math.max(ratio, 0), 1) * 100) + '%';
		pending = false;
	}
	window.addEventListener('scroll', function () {
		if (!pending) {
			pending = true;
			window.requestAnimationFrame(paintProgress);
		}
	}, { passive: true });
	window.addEventListener('resize', paintProgress, { passive: true });
	paintProgress();

	/* hero 光标位置跟随鼠标 */
	var hero = document.querySelector('.hero');
	if (hero) {
		hero.addEventListener('pointermove', function (event) {
			var rect = hero.getBoundingClientRect();
			hero.style.setProperty('--mx', (event.clientX - rect.left) + 'px');
			hero.style.setProperty('--my', (event.clientY - rect.top) + 'px');
		}, { passive: true });
	}

	/* 品牌图标按真实路径长度描线，避免用猜的 dash 长度 */
	Array.prototype.forEach.call(document.querySelectorAll('.brand svg path'), function (path) {
		var length = 0;
		try { length = path.getTotalLength(); } catch (e) { length = 700; }
		if (length > 0) {
			path.style.setProperty('--len', Math.ceil(length) + 'px');
		}
	});
})();