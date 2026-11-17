// Tokenize log text into plain strings and class names.
// Callers must insert those strings with text nodes. Log lines are untrusted.
(function (root) {
  const DEFAULT_COLORS = {
    error: '#ff7b72',
    warning: '#e3b341',
    success: '#3fb950',
    info: '#79c0ff',
    stage: '#ffa657',
    pipeline: '#8b949e',
    shell: '#d2a8ff',
    bracket: '#ffb86c',
    exception: '#ff7b72',
    url: '#58a6ff',
    timestamp: '#7ee787',
    file: '#79c0ff',
  };

  const LABELS = {
    error: 'Errors',
    warning: 'Warnings',
    success: 'Success',
    info: 'Info',
    stage: 'Pipeline stages',
    pipeline: 'Pipeline steps',
    shell: 'Shell commands (+)',
    bracket: 'Bracket tags',
    exception: 'Exceptions',
    url: 'URLs',
    timestamp: 'Timestamps',
    file: 'File locations',
  };

  const ANSI = {
    30: 'loghue-pipeline',
    31: 'loghue-error',
    32: 'loghue-success',
    33: 'loghue-warning',
    34: 'loghue-info',
    35: 'loghue-shell',
    36: 'loghue-info',
    37: 'loghue-pipeline',
    90: 'loghue-pipeline',
    91: 'loghue-error',
    92: 'loghue-success',
    93: 'loghue-warning',
    94: 'loghue-info',
    95: 'loghue-shell',
    96: 'loghue-info',
    97: 'loghue-pipeline',
  };

  function levelClass(word) {
    const upper = String(word).replace(/[\[\]]/g, '').toUpperCase();
    if (upper === 'ERROR' || upper === 'FAILURE' || upper === 'FAILED' || upper === 'FATAL') {
      return 'loghue-error';
    }
    if (upper === 'WARN' || upper === 'WARNING' || upper === 'SKIPPED' || upper === 'TODO') {
      return 'loghue-warning';
    }
    if (upper === 'SUCCESS' || upper === 'PASSED') return 'loghue-success';
    return 'loghue-info';
  }

  function rules() {
    return [
      { cls: 'loghue-url', re: /https?:\/\/[^\s<>"')\]]+/gi },
      { cls: 'loghue-timestamp', re: /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\]/gi },
      { cls: 'loghue-stage', re: /\[Pipeline\][^\n]*\bstage\b[^\n]*/gi },
      { cls: 'loghue-pipeline', re: /\[Pipeline\][^\n]*/gi },
      { cls: 'loghue-error', re: /#\d+\s+ERROR\b/gi },
      {
        re: /\[(?:ERROR|FAILURE|FATAL|WARN(?:ING)?|INFO|DEBUG|SUCCESS)\]/gi,
        classFor(match) { return levelClass(match[0]); },
      },
      {
        cls: 'loghue-file',
        re: /(?:[\w./@+-]+\.(?:js|mjs|cjs|ts|tsx|jsx|json|py|go|java|kt|rb|cs|cpp|cc|h|hpp|xml|yml|yaml|sh|gradle)|Dockerfile):\d+/gi,
      },
      { cls: 'loghue-exception', re: /\b(?:[\w$]+\.)*[\w$]*(?:Exception|Error)\b/g },
      { cls: 'loghue-exception', re: /\bat\s+(?:[\w$]+\.)+[\w$]+[^\n]*/g },
      { cls: 'loghue-timestamp', re: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/gi },
      { cls: 'loghue-timestamp', re: /\b\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:\s*[AP]M)?\b/gi },
      { cls: 'loghue-success', re: /\b\d[\d,]*\s+passed\b/gi },
      { cls: 'loghue-error', re: /\b\d[\d,]*\s+failed\b/gi },
      { cls: 'loghue-warning', re: /\b\d[\d,]*\s+(?:skipped|todo)\b/gi },
      {
        re: /\b(?:ERROR|FAILURE|FAILED|FATAL|WARN(?:ING)?|INFO|DEBUG|SUCCESS|PASSED|SKIPPED|TODO)\b/gi,
        classFor(match) { return levelClass(match[0]); },
      },
      { cls: 'loghue-error', re: />>>/g },
      { cls: 'loghue-bracket', re: /\[[^\]\n]{1,80}\]/g },
    ];
  }

  function pushToken(tokens, cls, text) {
    if (!text) return;
    const prev = tokens[tokens.length - 1];
    if (prev && prev.cls === cls) {
      prev.text += text;
      return;
    }
    tokens.push({ cls, text });
  }

  function ansiTokens(text) {
    const tokens = [];
    const re = /\u001b\[([0-9;]*)m/g;
    let cls = null;
    let last = 0;
    let match = re.exec(text);
    while (match) {
      if (match.index > last) pushToken(tokens, cls, text.slice(last, match.index));
      const codes = match[1] === '' ? [0] : match[1].split(';').map((part) => Number(part));
      for (const code of codes) {
        if (code === 0 || code === 39) cls = null;
        else if (ANSI[code]) cls = ANSI[code];
      }
      last = match.index + match[0].length;
      match = re.exec(text);
    }
    if (last < text.length) pushToken(tokens, cls, text.slice(last));
    return tokens;
  }

  function tokenize(text) {
    const source = String(text ?? '');
    if (!source) return [];
    if (source.includes('\u001b[')) return ansiTokens(source);

    const tokens = [];
    const matchers = rules();
    let index = 0;
    while (index < source.length) {
      const atLineStart = index === 0 || source[index - 1] === '\n';
      if (atLineStart) {
        const shell = /^[ \t]*\+[ \t]+\S[^\n]*/.exec(source.slice(index));
        if (shell && shell.index === 0) {
          pushToken(tokens, 'loghue-shell', shell[0]);
          index += shell[0].length;
          continue;
        }
      }

      let best = null;
      for (const rule of matchers) {
        rule.re.lastIndex = index;
        const match = rule.re.exec(source);
        if (!match || match[0].length === 0) continue;
        if (match.index < index) continue;
        if (!best || match.index < best.index) {
          best = {
            index: match.index,
            text: match[0],
            cls: rule.classFor ? rule.classFor(match) : rule.cls,
          };
        }
      }

      if (!best) {
        pushToken(tokens, null, source.slice(index));
        break;
      }
      if (best.index > index) pushToken(tokens, null, source.slice(index, best.index));
      pushToken(tokens, best.cls, best.text);
      index = best.index + best.text.length;
    }
    return tokens;
  }

  function lineTone(text) {
    const plain = String(text ?? '').replace(/\u001b\[[0-9;]*m/g, '');
    if (/\b(?:ERROR|FAILURE|FAILED|FATAL)\b|Exception|failed to solve|exit code:\s*[1-9]/i.test(plain)) {
      return 'error';
    }
    if (/\bWARN(?:ING)?\b|Finished:\s*UNSTABLE/i.test(plain)) return 'warning';
    if (/Finished:\s*SUCCESS/i.test(plain)) return 'success';
    return null;
  }

  function looksLikeLogText(text) {
    return /\[Pipeline\]|(?:^|\n)\s*\+[ \t]+\S|\b(?:ERROR|WARN(?:ING)?|FAILURE|SUCCESS|Exception)\b|https?:\/\/|#\d+\s|>>>/.test(text);
  }

  root.Loghue = {
    DEFAULT_COLORS,
    LABELS,
    tokenize,
    lineTone,
    looksLikeLogText,
  };
})(globalThis);
