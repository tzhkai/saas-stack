(function() {
  'use strict';

  function boot() {
    if (typeof marked === 'undefined') { setTimeout(boot, 50); return; }

    marked.setOptions({ breaks: true, gfm: true });

    /* ── DOM refs ── */
    var input = document.getElementById('md-input');
    var preview = document.getElementById('preview-content');
    var toolbar = document.querySelector('.toolbar');

    if (!input || !preview || !toolbar) {
      setTimeout(boot, 50);
      return;
    }

    /* ── helpers ── */
    function wrap(before, after) {
      var s = input.selectionStart, e = input.selectionEnd, v = input.value;
      var t = v.slice(s, e) || 'text';
      input.setRangeText(before + t + after, s, e, 'select');
      input.focus(); rerender();
    }

    function prefix(p) {
      var s = input.selectionStart, v = input.value;
      input.setRangeText(p, v.lastIndexOf('\n', s - 1) + 1, v.lastIndexOf('\n', s - 1) + 1, 'select');
      input.focus(); rerender();
    }

    function rerender() {
      var v = input.value.trim();
      try {
        preview.innerHTML = v
          ? marked.parse(v)
          : '<div class="empty-hint"><p>Write Markdown on the left, see the result here</p><p>Try: <code># Hello World</code></p></div>';
      } catch(e) {
        preview.innerHTML = '<pre style="white-space:pre-wrap;color:#94a3b8">' + v.replace(/</g,'&lt;') + '</pre>';
      }
    }

    function flash(el, msg) {
      if (!el) return;
      var orig = el.textContent;
      el.textContent = msg;
      setTimeout(function () { el.textContent = orig; }, 1200);
    }

    /* ── format map ── */
    var FORMATS = {
      'bold':        function () { wrap('**', '**'); },
      'italic':      function () { wrap('*', '*'); },
      'strike':      function () { wrap('~~', '~~'); },
      'ul':          function () { prefix('- '); },
      'ol':          function () { prefix('1. '); },
      'inline-code': function () { wrap('`', '`'); },
      'h2':          function () { prefix('## '); },
      'quote':       function () { prefix('> '); },
      'code-block':  function () {
        var s = input.selectionStart, e = input.selectionEnd, v = input.value;
        var t = v.slice(s, e) || 'code here';
        input.setRangeText('\n```\n' + t + '\n```\n', s, e, 'select');
        input.focus(); rerender();
      },
      'task':        function () { prefix('- [ ] '); },
      'hr':          function () { prefix('\n---\n'); }
    };

    /* ── actions map ── */
    var ACTIONS = {
      'copy': function (btn) {
        var v = input.value;
        if (!v.trim()) return;
        navigator.clipboard.writeText(v).then(function () { flash(btn, 'Copied!'); }).catch(function () {});
      },
      'export': function (btn) {
        var v = input.value.trim();
        if (!v) { alert('Nothing to export — write some Markdown first.'); return; }
        var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
          '<meta charset="UTF-8">\n' +
          '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
          '<title>Exported from MarkdownMaster</title>\n' +
          '<style>body{max-width:720px;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif;line-height:1.7;color:#1e293b}</style>\n' +
          '</head>\n<body>\n' +
          preview.innerHTML +
          '\n<hr><p><em>Exported from <a href="https://markdownmaster.site/editor/">MarkdownMaster</a></em></p>\n' +
          '</body>\n</html>';
        var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'markdown-export.html';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        flash(btn, 'Done!');
      },
      'print': function (btn) {
        var v = input.value.trim();
        if (!v) { alert('Nothing to print — write some Markdown first.'); return; }
        window.print();
      },
      'download-md': function (btn) {
        var v = input.value;
        if (!v.trim()) { alert('Nothing to download — write some Markdown first.'); return; }
        var slug = v.trim().slice(0, 50).replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-') || 'document';
        var blob = new Blob([v], { type: 'text/markdown;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = slug + '.md';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        flash(btn, 'Done!');
      },
      'clear': function () {
        if (!input.value.trim()) return;
        if (!confirm('Clear all content?')) return;
        input.value = ''; rerender();
      },
      'theme': function (btn) {
        var root = document.documentElement;
        var current = root.getAttribute('data-theme');
        var next = current === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        localStorage.setItem('mdm-theme', next);
        btn.textContent = next === 'light' ? '\u263E' : '\u2600';
      }
    };

    /* ── event delegation on toolbar ── */
    toolbar.addEventListener('click', function (e) {
      var btn = e.target.closest('.tb-btn');
      if (!btn) return;

      var fmt = btn.getAttribute('data-format');
      if (fmt && FORMATS[fmt]) { FORMATS[fmt](); return; }

      var action = btn.getAttribute('data-action');
      if (action && ACTIONS[action]) { ACTIONS[action](btn); return; }
    });

    /* ── init theme ── */
    var themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      var saved = localStorage.getItem('mdm-theme');
      var initial = saved || 'dark';
      document.documentElement.setAttribute('data-theme', initial);
      themeToggle.textContent = initial === 'light' ? '\u263E' : '\u2600';
    }

    /* ── divider drag ── */
    var divider = document.getElementById('divider');
    var dragging = false;
    if (divider) {
      divider.addEventListener('mousedown', function () { dragging = true; });
    }
    document.addEventListener('mouseup', function () { dragging = false; });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var wrap = document.querySelector('.editor-wrap');
      if (!wrap) return;
      var r = (e.clientX - wrap.getBoundingClientRect().left) / wrap.offsetWidth;
      document.getElementById('editor-pane').style.flex = r;
      document.getElementById('preview-pane').style.flex = 1 - r;
    });

    /* ── input listener ── */
    input.addEventListener('input', rerender);

    /* ── initial content ── */
    input.value = [
      '# Markdown Cheat Sheet',
      '',
      'A quick reference guide to Markdown syntax. Start typing on the left to edit.',
      '',
      '---',
      '',
      '## 1. Headings',
      '',
      'Use `#` symbols for headings (1-6 levels):',
      '',
      '```markdown',
      '# Heading 1',
      '## Heading 2',
      '### Heading 3',
      '```',
      '',
      '## 2. Text Formatting',
      '',
      '| Syntax | Output | Syntax | Output |',
      '| ------ | ------ | ------ | ------ |',
      '| `**bold**` | **bold** | `*italic*` | *italic* |',
      '| `~~strike~~` | ~~strike~~ | `` `code`` | `code` |',
      '',
      '## 3. Lists',
      '',
      '- Apples',
      '- Bananas',
      '- Oranges',
      '',
      '### Nested',
      '',
      '- Frontend',
      '  - HTML',
      '  - CSS',
      '  - JavaScript',
      '- Backend',
      '  - Node.js',
      '  - Python',
      '',
      '## 4. Code Blocks',
      '',
      '```javascript',
      'function greet(name) {',
      '  return `Hello, ${name}!`;',
      '}',
      'console.log(greet("Markdown"));',
      '```',
      '',
      '## 5. Blockquotes',
      '',
      '> Great tools let you focus on content creation, not formatting.',
      '',
      '## 6. Links & Images',
      '',
      '[Visit GitHub](https://github.com)',
      '',
      '## 7. Tables',
      '',
      '| Feature | Shortcut | Description |',
      '| ------- | -------- | ----------- |',
      '| Bold | Ctrl+B | **Bold** |',
      '| Italic | Ctrl+I | *Italic* |',
      '| Code | Ctrl+E | `Code` |',
      '',
      '## 8. Task Lists',
      '',
      '- [x] Learn Markdown',
      '- [ ] Write a blog post',
      '',
      '---',
      '',
      '> Tip: Click anywhere on the left. Preview updates in real time.',
      ''
    ].join('\n');
    rerender();
  }

  boot();
})();
