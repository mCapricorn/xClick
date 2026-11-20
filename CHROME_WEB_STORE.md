# Chrome Web Store Submission

## Upload Package
- Suggested file: `xclick-v0.5.0.zip`
- Manifest version: `0.5.0`

## Store Listing Draft
### Extension name
xClick

### Summary
Interaction effects for X and optional English or Chinese AI reply drafts using your own API key.

### Description
xClick adds lightweight visual and audio feedback to common interactions on X.

Features:
- Neon-style effects for likes, follows, and replies
- Keyboard-triggered feedback for common X shortcuts
- Visual mode selector: classic, alt, or rotate
- Sound mode selector: classic, alt, or rotate
- Independent sound toggle and volume control
- Popup controls for fast global on/off switching
- Reduced-motion friendly defaults

Notes:
- Users choose and edit suggestions before sending a reply themselves.
- All effects run locally in the browser.
- No remote audio files are downloaded.

### Category
Accessibility or Fun

### Language
English

## Privacy / Data Disclosure Draft
Data flows to disclose for this version:
- Optional AI replies process website content (original post text, optional X-hosted post and quoted-post photos, and loaded thread comments) and use the user’s API key for authentication.
- Does the extension sell user data? No.
- Clicking Generate sends post text, available thread comments, up to four X photo URLs when enabled for a compatible provider, and generation instructions including the optional reference language to the selected provider or user-configured HTTP or HTTPS relay, which infers the reply language from the post.
- Does the extension use data for purposes unrelated to the item’s core functionality? No.
- Does the extension use data for creditworthiness or lending purposes? No.
- Privacy policy URL: `https://github.com/mCapricorn/xClick/blob/main/PRIVACY_POLICY.md`

Why this is likely accurate:
- The extension stores local preferences with `chrome.storage.local`.
- The extension stores the active provider, model and key in extension-origin IndexedDB.
- Visual effects and synthesized audio work locally. Optional HTTP and HTTPS host permissions support custom relays. The extension requests access to the configured API host when the user saves or explicitly loads models.

## Assets Still Needed In Chrome Web Store Console
- At least 1 screenshot of the extension in use
- Optional promo images if you want better presentation
- Final category choice
- Support/contact details

## Recommended Submission Notes
- Single purpose: Assist interactions on X with local feedback and optional reply drafts.
- Host access rationale: Needs access to `x.com` and `twitter.com` pages to detect like, follow, and reply buttons and render effects.
- Storage rationale: Saves user settings such as enable toggles, modes, and volume.

## Suggested Submission Flow
1. Open Chrome Web Store Developer Dashboard.
2. Create a new item.
3. Upload the verified package for the current release.
4. Fill the listing fields using the draft above.
5. Add screenshots.
6. Complete the privacy answers.
7. Review permissions and host access explanations.
8. Submit for review.

Optional Doubao media actions send the selected draft, original post text and, with post photos enabled, one public photo URL to the configured API. Enabling GIF generation requests access to the two Beijing Ark output storage hosts to download the generated video without credentials. GIF conversion and file previews run locally. Adding a file places it in the X reply composer for review.
