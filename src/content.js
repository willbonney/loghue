(function () {
  if (globalThis.__loghueStarted) return;
  globalThis.__loghueStarted = true;

  const api = globalThis.Loghue;
  let enabled = true;
  let logRoot = undefined;
  let loose = false;
  let lastLocate = 0;
  let scanning = false;
  let queued = false;
  const observed = new Set();
  let observer = null;
  let cssText = '';

  function applyCssVars() {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(api.DEFAULT_COLORS)) {
      root.style.setProperty(`--loghue-${key}`, value);
    }
  }

  async function loadColors(colors) {
    const merged = { ...api.DEFAULT_COLORS, ...(colors || {}) };
    for (const [key, value] of Object.entries(merged)) {
      if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
        document.documentElement.style.setProperty(`--loghue-${key}`, value);
      }
    }
  }

  function pageMatches() {
    if (document.querySelector('pre.console-output, .jenkins-breadcrumbs, #breadcrumbBar, #jenkins, .jenkins-header')) {
      return true;
    }
    if (/jenkins|cloudbees/i.test(document.title || '')) return true;
    if (/\/job\/[^/]+\/\d+\//.test(location.pathname)) return true;
    if (/pipeline-explorer|\/console\/?$/.test(location.pathname)) return true;
    const assets = document.querySelectorAll('script[src], link[href], img[alt], img[src]');
    for (const node of assets) {
      const hay = `${node.getAttribute?.('src') || ''} ${node.getAttribute?.('href') || ''} ${node.getAttribute?.('alt') || ''}`;
      if (/jenkins|cloudbees/i.test(hay)) return true;
    }
    return explorerChrome();
  }

  function explorerChrome() {
    if (/CloudBees Pipeline Explorer/i.test(document.title || '')) return true;
    for (const input of document.querySelectorAll('input[placeholder]')) {
      if (/stage name/i.test(input.getAttribute('placeholder') || '')) return true;
    }
    if (!document.body) return false;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let seen = 0;
    while (walker.nextNode() && seen < 500) {
      seen += 1;
      const value = walker.currentNode.nodeValue || '';
      if (value.includes('Filter by tree view') || value.includes('CloudBees Pipeline Explorer')) return true;
    }
    return false;
  }

  function observe(node) {
    if (!observer || !node || observed.has(node)) return;
    observed.add(node);
    observer.observe(node, { childList: true, subtree: true, characterData: true });
    if (node.querySelectorAll) {
      for (const el of node.querySelectorAll('*')) {
        if (el.shadowRoot) observe(el.shadowRoot);
      }
    }
  }

  async function yieldToMain() {
    if (globalThis.scheduler?.yield) {
      await scheduler.yield();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  function collectRows(rootNode) {
    return api.collectRows(rootNode, loose);
  }

  async function paintRows(rows) {
    const batchSize = 40;
    for (let index = 0; index < rows.length; index += batchSize) {
      const batch = rows.slice(index, index + batchSize);
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          for (const info of batch) api.applyRow(info);
          resolve();
        });
      });
      if (index + batchSize < rows.length) await yieldToMain();
    }
  }

  function paintClassicLogs() {
    for (const pre of document.querySelectorAll('pre.console-output')) {
      if (pre.textContent.length > api.CLASSIC_LIMIT) continue;
      api.paintClassic(pre);
    }
  }

  function locate() {
    loose = false;
    let rootNode = api.locateLogRoot(document, false);
    if (!rootNode && explorerChrome()) {
      loose = true;
      rootNode = api.locateLogRoot(document, true);
    }
    if (rootNode) {
      const tree = rootNode.getRootNode?.();
      if (tree && tree.nodeType === 11) {
        observe(tree);
        void injectShadowCss(tree);
      }
      observe(rootNode);
    }
    return rootNode;
  }

  async function injectShadowCss(tree) {
    if (!tree?.append || tree.querySelector?.('style[data-loghue]')) return;
    try {
      if (!cssText) {
        const response = await fetch(chrome.runtime.getURL('src/content.css'));
        if (!response.ok) return;
        cssText = await response.text();
      }
      const style = document.createElement('style');
      style.dataset.loghue = '1';
      style.textContent = cssText;
      tree.append(style);
    } catch (err) {
      console.error('Loghue could not style a shadow log', err);
    }
  }

  async function scan() {
    if (!enabled || scanning) {
      queued = !enabled ? queued : true;
      return;
    }
    scanning = true;
    try {
      if (!logRoot || !logRoot.isConnected) {
        const now = Date.now();
        if (logRoot === null && now - lastLocate < 1000) {
          paintClassicLogs();
          return;
        }
        lastLocate = now;
        logRoot = locate() || null;
      }
      if (logRoot) await paintRows(collectRows(logRoot));
      paintClassicLogs();
    } catch (err) {
      console.error('Loghue failed to highlight logs', err);
    } finally {
      scanning = false;
      if (queued) {
        queued = false;
        schedule();
      }
    }
  }

  function schedule() {
    if (!enabled) return;
    requestAnimationFrame(() => { scan(); });
  }

  function onMutations(records) {
    if (!enabled) return;
    for (const record of records) {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (!target || target.closest?.('.loghue')) continue;
      if (logRoot && logRoot.isConnected && !logRoot.contains(target) && target !== logRoot) continue;
      if (!logRoot || !logRoot.isConnected) logRoot = undefined;
      schedule();
      return;
    }
  }

  function clearPage() {
    api.clearRoot(document);
    for (const node of observed) {
      if (node.querySelectorAll && node !== document.documentElement) {
        try { api.clearRoot(node); } catch { /* shadow root may be gone */ }
      }
    }
  }

  function onStorageChanged(changes, area) {
    if (area !== 'sync') return;
    if (changes.colors?.newValue) loadColors(changes.colors.newValue);
    if (!changes.enabled) return;
    enabled = changes.enabled.newValue !== false;
    if (!enabled) {
      clearPage();
      return;
    }
    logRoot = undefined;
    watch();
  }

  function watch() {
    if (!enabled || !pageMatches()) return;
    if (!observer) {
      observer = new MutationObserver(onMutations);
      observe(document.documentElement);
    }
    schedule();
  }

  async function main() {
    applyCssVars();
    try {
      const stored = await chrome.storage.sync.get({ enabled: true, colors: api.DEFAULT_COLORS });
      enabled = stored.enabled !== false;
      await loadColors(stored.colors);
    } catch (err) {
      console.error('Loghue failed to read settings', err);
    }

    chrome.storage.onChanged.addListener(onStorageChanged);
    watch();
  }

  main();
})();
