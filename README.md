<p align="center">
  <img src="icons/icon-128.png" alt="Loghue" width="128" height="128">
</p>

# Loghue

Syntax highlighting for Jenkins console logs in CloudBees CI Managed Controller, including CloudBees Pipeline Explorer.

Pipeline Explorer renders each log line as its own row, with a line number and a timestamp, so Loghue colors those rows as they scroll into view.

Highlighting stays in the browser. Log text is not sent anywhere.

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
