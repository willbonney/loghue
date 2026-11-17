// Find Pipeline Explorer rows and paint tokens onto them.
// Virtualized lists recycle row nodes, so a row is repainted when its text changes.
(function (root) {
  const api = root.Loghue;
  const CLOCK = /^(?:\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:\s*[AP]M)?)$/i;
  const LINE_NO = /^\d{1,7}$/;
  const SINGLE_ROW = /^(\d{1,7})\s+(\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:\s*[AP]M)?)\s+(\S[\s\S]+)$/i;
  const PREFIX = /^(\d{1,7}\s+\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:\s*[AP]M)?\s+)/i;
  const CLASSIC_LIMIT = 300000;

  function tagName(el) {
    return el.tagName ? el.tagName.toUpperCase() : '';
  }

  function skippedCell(el) {
    const tag = tagName(el);
    if (tag === 'BUTTON' || tag === 'SVG') return true;
    const role = el.getAttribute?.('role');
    return role === 'button' || role === 'menu';
  }

  function deepen(el) {
    let node = el;
    while (node.children && node.children.length === 1) {
      const only = node.children[0];
      if (!only || only.classList?.contains('loghue')) break;
      if (skippedCell(only)) break;
      if (only.textContent !== node.textContent) break;
      node = only;
    }
    return node;
  }

  function classifyRow(el, options = {}) {
    if (!el || el.nodeType !== 1) return null;
    if (el.closest?.('[role="tree"], [role="treeitem"], input, textarea, select, [contenteditable="true"]')) {
      return null;
    }

    const kids = [];
    for (const child of el.children || []) {
      if (!skippedCell(child)) kids.push(child);
    }

    if (kids.length === 0) {
      const text = (el.textContent || '').trim();
      if (!SINGLE_ROW.test(text)) return null;
      return { row: el, time: null, message: el, single: true };
    }

    let lineNo = null;
    let time = null;
    const rest = [];
    for (const child of kids) {
      const trimmed = child.textContent.trim();
      if (!lineNo && LINE_NO.test(trimmed)) {
        lineNo = child;
        continue;
      }
      if (!time && CLOCK.test(trimmed)) {
        time = child;
        continue;
      }
      rest.push(child);
    }

    if (!lineNo || rest.length === 0) return null;
    if (!time && !options.loose) return null;

    let message = rest[0];
    for (const candidate of rest) {
      if (candidate.textContent.length > message.textContent.length) message = candidate;
    }
    message = deepen(message);
    if (!message.textContent.trim()) return null;
    if (message.querySelector?.('div, tr, li, table')) return null;
    if (!time && !api.looksLikeLogText(message.textContent)) return null;
    return { row: el, time, message, single: false };
  }

  function queryAllDeep(rootNode, selector) {
    const out = [];
    const seen = new Set();
    const stack = [rootNode];
    while (stack.length) {
      const node = stack.pop();
      if (!node || seen.has(node) || !node.querySelectorAll) continue;
      seen.add(node);
      for (const el of node.querySelectorAll(selector)) out.push(el);
      for (const el of node.querySelectorAll('*')) {
        if (el.shadowRoot) stack.push(el.shadowRoot);
      }
    }
    return out;
  }

  function groupBy(infos, parentOf) {
    const groups = new Map();
    for (const info of infos) {
      const parent = parentOf(info);
      if (!parent) continue;
      let list = groups.get(parent);
      if (!list) {
        list = [];
        groups.set(parent, list);
      }
      list.push(info);
    }
    let best = null;
    for (const [parent, list] of groups) {
      if (!best || list.length > best.list.length) best = { parent, list };
    }
    return best;
  }

  function locateLogRoot(rootNode, loose) {
    const infos = [];
    for (const el of queryAllDeep(rootNode, 'div, tr, li')) {
      const info = classifyRow(el, { loose });
      if (info) infos.push(info);
    }
    const minimum = loose ? 1 : 3;
    const byParent = groupBy(infos, (info) => info.row.parentElement);
    if (byParent && byParent.list.length >= minimum) return byParent.parent;
    const byGrandparent = groupBy(infos, (info) => info.row.parentElement?.parentElement);
    if (byGrandparent && byGrandparent.list.length >= minimum) return byGrandparent.parent;
    return null;
  }

  function tokensFor(text, single) {
    if (!single) return api.tokenize(text);
    const prefix = PREFIX.exec(text);
    if (!prefix) return api.tokenize(text);
    return [{ cls: null, text: prefix[1] }, ...api.tokenize(text.slice(prefix[1].length))];
  }

  function renderTokens(el, tokens) {
    const frag = el.ownerDocument.createDocumentFragment();
    for (const token of tokens) {
      if (!token.cls) {
        frag.append(el.ownerDocument.createTextNode(token.text));
        continue;
      }
      const span = el.ownerDocument.createElement('span');
      span.className = `loghue ${token.cls}`;
      span.textContent = token.text;
      frag.append(span);
    }
    el.replaceChildren(frag);
  }

  function unwrap(span) {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    span.remove();
    parent.normalize?.();
  }

  function unwrapLoghue(el) {
    const spans = [...el.querySelectorAll('.loghue')];
    for (const span of spans) unwrap(span);
  }

  function paintMessage(el, single) {
    const text = el.textContent;
    if (el.dataset?.loghueText === text) return;
    unwrapLoghue(el);
    const foreign = [...(el.children || [])].some((child) => !child.classList?.contains('loghue'));
    if (foreign) {
      paintTextNodes(el);
    } else {
      renderTokens(el, tokensFor(text, single));
    }
    if (el.dataset) el.dataset.loghueText = el.textContent;
  }

  function paintTextNodes(el) {
    const doc = el.ownerDocument;
    const walker = doc.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const parent = node.parentElement;
      if (!parent || parent.closest('.loghue, .timestamp')) continue;
      const value = node.nodeValue;
      if (!value || !value.trim()) continue;
      const tokens = api.tokenize(value);
      if (!tokens.some((token) => token.cls)) continue;
      const frag = doc.createDocumentFragment();
      for (const token of tokens) {
        if (!token.cls) {
          frag.append(doc.createTextNode(token.text));
          continue;
        }
        const span = doc.createElement('span');
        span.className = `loghue ${token.cls}`;
        span.textContent = token.text;
        frag.append(span);
      }
      node.replaceWith(frag);
    }
  }

  function applyRow(info) {
    const text = info.message.textContent;
    const tone = api.lineTone(info.single ? text.replace(PREFIX, '') : text);
    info.row.classList.toggle('loghue-line-error', tone === 'error');
    info.row.classList.toggle('loghue-line-warning', tone === 'warning');
    info.row.classList.toggle('loghue-line-success', tone === 'success');
    if (info.time) info.time.classList.add('loghue-time');
    paintMessage(info.message, info.single);
  }

  function collectRows(rootNode, loose) {
    const rows = [];
    const seen = new Set();
    for (const el of queryAllDeep(rootNode, 'div, tr, li')) {
      if (rootNode.contains && el !== rootNode && !rootNode.contains(el)) continue;
      const info = classifyRow(el, { loose });
      if (!info || seen.has(info.row)) continue;
      seen.add(info.row);
      rows.push(info);
    }
    return rows.filter((info) => !rows.some((other) => other.row !== info.row && info.row.contains?.(other.row)));
  }

  function paintClassic(pre) {
    if (!pre || pre.textContent.length > CLASSIC_LIMIT) return;
    for (const stamp of pre.querySelectorAll('.timestamp')) stamp.classList.add('loghue-time');
    const doc = pre.ownerDocument;
    const walker = doc.createTreeWalker(pre, 4);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let pending = false;
    for (const node of nodes) {
      const parent = node.parentElement;
      if (!parent || parent.closest('.loghue, .timestamp')) continue;
      if (node.nodeValue && node.nodeValue.trim()) pending = true;
    }
    if (!pending) return;
    paintTextNodes(pre);
  }

  function clearRoot(rootNode) {
    const doc = rootNode.ownerDocument || rootNode;
    const scope = rootNode.querySelectorAll ? rootNode : doc;
    if (!scope.querySelectorAll) return;
    for (const span of [...scope.querySelectorAll('.loghue')]) unwrap(span);
    for (const el of scope.querySelectorAll('.loghue-line-error, .loghue-line-warning, .loghue-line-success')) {
      el.classList.remove('loghue-line-error', 'loghue-line-warning', 'loghue-line-success');
    }
    for (const el of scope.querySelectorAll('.loghue-time')) el.classList.remove('loghue-time');
    for (const el of scope.querySelectorAll('[data-loghue-text]')) delete el.dataset.loghueText;
  }

  api.CLASSIC_LIMIT = CLASSIC_LIMIT;
  api.classifyRow = classifyRow;
  api.locateLogRoot = locateLogRoot;
  api.queryAllDeep = queryAllDeep;
  api.applyRow = applyRow;
  api.collectRows = collectRows;
  api.paintClassic = paintClassic;
  api.clearRoot = clearRoot;
})(globalThis);
