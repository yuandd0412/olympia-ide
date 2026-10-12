// Olympia IDE 官网交互：移动菜单 + 复制文件名。无外部依赖。

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
