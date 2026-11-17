# Loghue

Syntax highlighting for Jenkins console logs in CloudBees CI Managed Controller, including CloudBees Pipeline Explorer.

Pipeline Explorer renders each log line as its own row, with a line number and a timestamp, so Loghue colors those rows as they scroll into view.

Highlighting stays in the browser. Log text is not sent anywhere.

## What it colors

- Errors, warnings, failures, and exception names, with a bar on the row
- `Finished: SUCCESS` and `Finished: FAILURE`
- Pipeline steps (`[Pipeline]`) and stage lines
- Shell traces that start with `+`
- Bracket tags such as `[WS-CLEANUP]` and `[ERROR]`
- URLs, timestamps, `file:line` references, and BuildKit `#10 ERROR` / `>>>` markers
- ANSI colors when the escape codes are still in the text
- Classic `pre.console-output` logs up to about 300 KB. Larger classic logs are left alone; Pipeline Explorer only has the visible rows in the page, so those stay highlighted.

## Install

The extension folder is this repository. It loads unpacked. There is no build step.

Chrome or Edge:

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Choose Load unpacked and select this directory.

Firefox:

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose Load Temporary Add-on and select `manifest.json`.

Click the toolbar icon to turn highlighting off, or open Colors to change the palette. The choice is stored with `storage.sync`.

## Tests

```bash
node --test
```
