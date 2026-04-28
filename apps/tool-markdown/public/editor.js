(function(){
  if (typeof marked === 'undefined') { setTimeout(arguments.callee, 50); return; }
  marked.setOptions({ breaks:true, gfm:true });

  var input = document.getElementById('md-input');
  var preview = document.getElementById('preview-content');

  function up() {
    var v = input.value.trim();
    preview.innerHTML = v
      ? marked.parse(v)
      : '<div class="empty-hint"><p>Write Markdown on the left, see the result here</p><p>Try: <code># Hello World</code></p></div>';
  }

  input.addEventListener('input', up);

  window.f = function(b, a) {
    var s = input.selectionStart, e = input.selectionEnd, v = input.value;
    var t = v.slice(s,e) || 'text';
    input.setRangeText(b + t + a, s, e, 'select');
    input.focus(); up();
  };
  window.l = function(p) {
    var s = input.selectionStart, v = input.value;
    var ls = v.lastIndexOf('\n', s-1) + 1;
    input.setRangeText(p, ls, ls, 'select');
    input.focus(); up();
  };
  window.cb = function() {
    var s = input.selectionStart, e = input.selectionEnd, v = input.value;
    var t = v.slice(s,e) || 'code here';
    input.setRangeText('\n```\n' + t + '\n```\n', s, e, 'select');
    input.focus(); up();
  };
  window.cp = function() {
    var v = input.value;
    if (!v.trim()) return;
    navigator.clipboard.writeText(v).then(function(){
      var target = document.querySelector('[data-action="copy"]');
      if (target) { var t = target.textContent; target.textContent = 'Copied!'; setTimeout(function(){ target.textContent = t; }, 1200); }
    }).catch(function(){});
  };
  window.xh = function() {
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
    var b = new Blob([html], { type:'text/html;charset=utf-8' });
    var u = URL.createObjectURL(b);
    var a = document.createElement('a');
    a.href = u;
    a.download = 'markdown-export.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(u);
    var btn = document.querySelector('[data-action="export"]');
    if (btn) { var t=btn.textContent; btn.textContent='Done!'; setTimeout(function(){btn.textContent=t;},1200); }
  };
  window.cl = function() {
    if (!input.value.trim()) return;
    if (!confirm('Clear all content?')) return;
    input.value = '';
    up();
  };

  // Divider drag
  var dv = document.getElementById('divider');
  var dd = false;
  dv.addEventListener('mousedown', function(){ dd = true; });
  document.addEventListener('mouseup', function(){ dd = false; });
  document.addEventListener('mousemove', function(e){
    if (!dd) return;
    var w = document.querySelector('.editor-wrap');
    var r = (e.clientX - w.getBoundingClientRect().left) / w.offsetWidth;
    document.getElementById('editor-pane').style.flex = r;
    document.getElementById('preview-pane').style.flex = 1 - r;
  });

  // Default content
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
    '| `~~strike~~` | ~~strike~~ | `` `code` `` | `code` |',
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
  up();
})();
