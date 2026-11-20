# Privacy Policy for xClick

Last updated November 20, 2026.

## Local effects and preferences

xClick reads supported interface elements on x.com and twitter.com to display interaction effects and reply controls. Visual effects and audio run locally. The extension saves appearance and sound preferences in the browser’s local extension storage.

## Optional AI reply drafts

The model picker can request a model list directly from the selected provider with your API key. With a saved key and site permission it can refresh the list when you open AI settings. This request contains no post or draft text.

When you configure AI replies, xClick keeps each saved provider’s model settings and API key in the extension’s local browser database. If you set a custom HTTP or HTTPS base URL, xClick also stores that URL and sends the key, model-list requests and generation requests to that relay. The relay receives the same request data described below. With HTTP, the key and request data travel unencrypted. Otherwise the key authenticates directly to the selected provider. If you enter a Claude workspace ID, xClick stores it with the key and sends it to the configured Claude API when listing models or generating replies. You can remove every provider profile and key in AI settings by choosing **Clear all provider settings**.

Clicking **AI Generate** sends up to 6,000 characters of the original post’s text and up to five loaded comments from the same discussion (up to 300 characters each), along with generation instructions, to the configured API address. With post photos enabled (default), the provider can also receive up to four X-hosted photo URLs from that post and its quoted post and retrieve the images. Only recognized vision models receive photo URLs. If the provider rejects the image input and the post contains text, xClick can retry once with text only. With bilingual assistance enabled, the request includes the selected native language for reference translations. Both preferences are saved with the local configuration. The provider infers the reply language from the post. Post text may contain personal information. The provider receives the network request from your device and processes it under its own terms and privacy policy. Its API charges may apply.

Suggestions appear in the reply dialog. Selecting one appends it to the X draft, which X handles according to its own policies. xClick does not automatically publish replies, send your existing draft to the provider, or keep a history of posts and suggestions. xClick uses no developer-operated relay or analytics service.

## Contact

For privacy questions, use the [project support page](https://github.com/mCapricorn/xClick/issues).

Optional OpenAI image generation and Doubao media actions send the selected draft, original post text and, with post photos enabled, one public photo URL to the configured API. Enabling GIF generation requests access to the two Beijing Ark output storage hosts to download the generated video without credentials. GIF conversion and file previews run locally. Adding a file places it in the X reply composer for review.
