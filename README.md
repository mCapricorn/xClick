# xClick

xClick is a Chrome / Edge Manifest V3 extension that adds lightweight interaction effects to X:
- Like: neon heart bursts, rotating visual variants, and synthesized click feedback.
- Follow: expanding rings, profile-follow cues, and alternate sound palettes.
- Reply: scanline glitch FX, rotating overlays, and synthesized glitch feedback.
- Comment/post send: a separate burst animation with a rising two- or three-note confirmation chime.

All sounds are synthesized locally with the Web Audio API.

## AI reply drafts

1. Open **Configure provider** and choose your provider. Pick a suggested model or enter a custom ID. For OpenAI, Claude, Gemini, Grok, DeepSeek, Kimi and Doubao, enter your API key and use **Load provider models** to retrieve the provider’s list. With a saved key and host access, the list loads automatically. Qwen and GLM use built-in suggestions. Save your selection. For Doubao, use the Beijing Ark API key value and select a model, or enter your custom inference endpoint ID (`ep-…`).
2. Click the sparkle icon (**AI Generate / AI 生成**) at the end of the media and emoji tools in the reply composer. The sliders beside it open AI settings. Suggestions appear below the toolbar. Your provider uses the original post as its main source and up to five already-loaded comments from the discussion as optional background. It drafts replies in its primary language (English, Simplified Chinese, or Traditional Chinese). API charges may apply.
3. Under **Advanced model settings**, you can select a model for posts with photos from the same provider, using the same key. The initial selection uses the default reply model. With **Send post photos** enabled (default), generation includes up to four X photo links from the original or its quoted post. The result shows how many photos were sent. Text-only models and unrecognized model IDs receive text only. If a recognized vision model rejects the image input, xClick retries once using the post text. Image-only posts require a recognized vision model.
4. Enable **Show native-language references**, choose your native language and save. When a reply is in another language, its translation appears below the suggestion. Choose a suggestion to append only its original wording to your draft. Edit it and use X’s Reply button when ready.
5. Under **Reply styles**, select one or more styles and save. The next generation returns one draft per checked style. Minimal, Concise, Conversational, Vivid, and Chatty & enthusiastic are selected by default. Optional styles include Curious, Dry humor, Supportive, and **Ask Grok**. Ask Grok adds a draft that mentions `@grok` and asks about a detail in the post. Your selected provider generates it alongside the other drafts.

For a relay, select the provider whose API protocol it implements. For example, choose **OpenAI** for a Chat Completions-compatible relay, enter `https://relay.example/v1` as the **API base URL**, and enter the relay’s key. HTTP relay URLs are also supported. HTTP sends the API key and request data in cleartext. Include any required path prefix or API version. xClick appends the operation path (such as `/chat/completions` or `/models`). Leave the field empty to use the official API. Changing the base URL requires entering the key for the new address.

With OpenAI and `gpt-6.2-sol` saved as the default reply model, **Generate image** uses the Responses API’s `image_generation` tool. Custom API addresses must also support that tool.

For Doubao, enter an activated Seedream or Seedance ID in **Advanced model settings** to enable **Generate image** or **Generate GIF** beside each draft. After inserting a draft, its media actions stay below the composer. If image generation is not configured, **Set up image generation** opens AI settings. Each generation click requests one paid generation using that draft, the original post and optionally its first photo. Preview the file, then choose **Add to reply** or download it. GIF conversion runs locally.

AI settings remember the last saved key, API address and models for each provider in this browser. Selecting a provider restores its settings. Click **Save** to use it for replies. **Clear all provider settings** removes every saved provider and key.

## Features
- Use the language selector at the top right of the popup for English, 简体中文, 繁體中文, Deutsch, Italiano, 日本語, 한국어, or Français. The popup and AI settings initially use the browser language and remember your selection.
- Popup-based global enable switch for all effects.
- Independent animation enable switches for like, follow, and reply scenes.
- A separate animation setting for sending a comment/post.
- Separate animation styles per scene (pulse, neon burst, or rotate).
- Animation studio in the popup with local previews for likes, follows, replies, and comments.
- Cyber neon, aurora, sakura, monochrome, and shuffled custom color palettes shared with X page effects.
- Keyboard-triggered FX support for common X shortcuts: `L` like, `R` reply, `F` follow nearby profile actions.
- Sound mode selector: classic, alt, or rotate.
- Independent sound toggle and volume control.
- Preview buttons in the popup for each scene, with matching synthesized sounds when sound is enabled.
- Reduced-motion friendly defaults.

## Install
1. Open chrome://extensions or edge://extensions.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this project folder.
5. Refresh x.com.

## Development

See the [development guide](docs/DEVELOPMENT.md) for local checks and browser testing. The [contribution guide](CONTRIBUTING.md) covers tasks, commits, and pull requests. The [project status](docs/status.md) records the current baseline.

## Privacy
- Privacy policy: https://github.com/mCapricorn/xClick/blob/main/PRIVACY_POLICY.md

## Release
- Current version: 0.5.0
- Suggested release tag: v0.5.0
- Suggested release asset: xclick-v0.5.0.zip

### 0.5.0
- Generate English or Chinese reply drafts with a user-configured AI provider.

### 0.4.4
- Add a popup animation studio with local visual and sound previews for all four interaction scenes.
- Add shared Cyber neon, Aurora, Sakura, Monochrome, and randomized custom themes for popup and X page effects.

### 0.4.3
- Fix the `R` reply shortcut so X handling the key does not suppress its visual feedback.
- Unlock synthesized audio during the keyboard gesture so reply shortcut sounds can play.
- Add independent animation switches and style selectors for like, follow, and reply.
- Separate reply-composer and comment-send animation controls.

### 0.4.2
- Fix the `R` reply shortcut so X handling the key does not suppress its visual feedback.
- Unlock synthesized audio during the keyboard gesture so reply shortcut sounds can play.

### 0.4.1
- Fix clicks on the Enable effects and Enable sounds switch tracks.
- Add visible keyboard focus and disabled styling for switches.

## Notes
- Effects are decorative only and do not automate any X action.
- All effects run locally.
- X may change its DOM over time, so selectors may need future tuning.
