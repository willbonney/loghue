# Chrome Web Store Listing — Loghue

> Last Updated: 2026-11-18

The same package is uploaded to Firefox Add-ons. Firefox fields are at the bottom.

## Store Listing

**Extension Name** [REQUIRED]

Loghue

**Short Description** [REQUIRED]

Syntax highlighting for Jenkins console logs in CloudBees CI Pipeline Explorer.

**Detailed Description** [REQUIRED]

Paste this into the store. The store does not render markdown.

```
Loghue colors Jenkins and CloudBees CI console logs while you read them.

FEATURES
• Errors, failures, and exception lines such as TypeError are shown in red
• Warnings, success lines, pipeline stages, and pipeline steps each get their own color
• Shell commands, bracket tags, timestamps, URLs, and file paths are colored too
• Colors update as new log lines appear
• Turn highlighting off from the toolbar icon
• Change each color from the Colors page

HOW TO USE
1. Install Loghue and open a Jenkins or CloudBees CI console log.
2. Errors, paths, and the other line types above are colored automatically.
3. Click the Loghue icon to turn highlighting off, or open Colors to change the palette.

PRIVACY
Log text stays in the browser. Loghue does not collect it and does not send it anywhere. The on/off choice and your colors are saved in the browser. If browser sync is on, those settings sync with your browser account.

PERMISSIONS
• Storage — saves whether highlighting is on and which colors you picked.
• Read and change data on all sites — a Jenkins or CloudBees controller can be hosted on any site. Loghue colors the console log on the page you open. It does not send that log anywhere.

SUPPORT
Email hello@wbonney.com or open an issue at https://github.com/willbonney/loghue/issues

Loghue is not affiliated with Jenkins or CloudBees.

Version 0.1.0
```

**Category** [REQUIRED]

Developer Tools

**Single Purpose** [REQUIRED]

Colors Jenkins and CloudBees CI console logs in the browser.

**Primary Language** [REQUIRED]

English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | icons/icon-128.png |
| Screenshot 1 [REQUIRED] | 1280×800 | ✅ Ready | store/screenshot-log.png |
| Screenshot 2 [RECOMMENDED] | 1280×800 | ✅ Ready | store/screenshot-options.png |
| Screenshot 3 [RECOMMENDED] | 1280×800 | ⬜ Not created | |
| Screenshot 4 | 1280×800 | ⬜ Not created | |
| Screenshot 5 | 1280×800 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ✅ Ready | store/promo-440x280.png |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

### Screenshot Notes

Screenshot 1 shows a console log colored by the same highlighter the extension uses: a failed test line, a TypeError line, an error line, a file path, a URL, and the finished line.

Screenshot 2 shows the toolbar popup and the Colors page with the default palette.

Do not add Jenkins or CloudBees logos to the screenshots.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| storage | permissions | Saves whether highlighting is on and the colors the user picks. If the user has browser sync on, the browser syncs those settings to the user's other browsers. Log text is not saved. |
| `<all_urls>` | host_permissions | Jenkins and CloudBees controllers are installed on many different sites, so the host cannot be limited to one domain. Loghue colors the console log on the page the user is reading. It does not send that log to the developer or to any other service. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No data is sent to the developer. Do not check the store's "I do not use or transfer user data" box without reading this, because the on/off choice and colors are stored with browser sync.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | | No |
| Health info | No | No | | No |
| Financial info | No | No | | No |
| Authentication info | No | No | | No |
| Personal communications | No | No | | No |
| Location | No | No | | No |
| Web history | No | No | | No |
| User activity | No | No | | No |
| Website content | Read on the page only | No | Colors the visible console log. The text is not stored and is not sent anywhere. | No |

The only values Loghue stores are the highlighting switch and the chosen colors. `storage.sync` lets the browser sync those values when the user has sync turned on. That sync is the browser account, not a Loghue server. The developer never receives it.

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED]

https://github.com/willbonney/loghue/blob/main/PRIVACY.md

This address works after `PRIVACY.md` is on the public `main` branch. Open it in a private window before you submit. A 404 rejects the listing.

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED]

Will

**Contact Email** [REQUIRED]

hello@wbonney.com

**Support URL / Email** [RECOMMENDED]

https://github.com/willbonney/loghue/issues

**Homepage URL** [RECOMMENDED]

https://github.com/willbonney/loghue

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.1.0 | 2026-11-18 | First listing. Colors Jenkins and CloudBees CI console logs in the browser. | Draft |

## Review Notes

Paste this in the reviewer notes box:

```
Loghue's only purpose is to color Jenkins and CloudBees CI console logs.

Host access is <all_urls> because those controllers are self-hosted on arbitrary domains. The content script reads the visible log text, colors it in the page, and does not transmit it. There is no remote code, no analytics, and no developer server.

storage saves the on/off switch and the color palette. Browser sync may sync those settings with the user's browser account. Log text is not stored.

The gecko id and data_collection_permissions block are for Firefox. Chrome ignores them. data_collection_permissions.required is ["none"] because the extension does not collect or transmit user data to the developer.
```

### Known Issues / Limitations

Highlighting depends on the console page exposing log rows as text. A controller that draws the log another way will not be colored. Classic Jenkins consoles over about 300 KB are left unchanged so the page stays responsive.

### Rejection History

None yet.

## Package

From the repo root:

```bash
node scripts/package.mjs
```

Upload `dist/loghue-0.1.0.zip` to both stores. The zip contains `manifest.json`, `src/`, and the 16, 48, and 128 icons. It leaves out this file, the README, the privacy policy, `store/`, and `scripts/`.

Before each later upload, increase `version` in `manifest.json`. A store rejects a version that is not higher than the one already published.

## Firefox Add-ons

Account: https://addons.mozilla.org/developers/ (free)

Submit the same zip as a listed add-on on the public site.

| Field | Value |
|-------|-------|
| Name | Loghue |
| Add-on ID | `loghue@willbonney.github.io` (already in the manifest; do not change it) |
| Summary | Syntax highlighting for Jenkins console logs in CloudBees CI Pipeline Explorer. |
| Description | Use the detailed description above. |
| Categories | Web Development |
| License | All Rights Reserved, unless you add a license file |
| Firefox version | 128 or newer, from `strict_min_version` |
| Data collection | The manifest declares `required: ["none"]`. That matches the extension: it does not transmit log text or settings to the developer. |
| Privacy policy | Same URL as Chrome |
| Support email | hello@wbonney.com |
| Homepage | https://github.com/willbonney/loghue |
| Screenshots | `store/screenshot-log.png` and `store/screenshot-options.png` |

Release Firefox only installs a signed add-on. The temporary add-on loaded from `about:debugging` is unsigned and is removed when Firefox exits. After review, Mozilla signs the file.

Notes for the Firefox reviewer: use the same reviewer notes as Chrome. The source in the zip is the original script, not a minified build, so a separate source package is not required.
