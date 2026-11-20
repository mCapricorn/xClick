// Use model IDs rather than provider-wide defaults. Unrecognized IDs (including
// private endpoint aliases) start with text only. Keep dated snapshots explicit.
const visionModels = {
  openai: /^(?:gpt-4o(?:-mini)?|gpt-4\.1(?:-mini)?|gpt-5(?:\.[1245])?(?:-mini|-nano)?|o3|o4-mini)(?:-\d{4}-\d{2}-\d{2})?$/,
  anthropic: /^claude-(?:haiku-4-5|sonnet-4-[56]|opus-4-[156])(?:-\d{8})?$/,
  google: /^(?:models\/)?gemini-(?:flash-latest|2\.5-(?:flash|pro)|3\.8-flash)$/,
  grok: /^grok-(?:4\.[3567]|2-vision-1212)(?:-latest)?$/,
  qwen: /^qwen(?:-vl-(?:plus|max)|3-vl-(?:plus|flash))(?:-latest|-\d{4}-\d{2}-\d{2})?$/,
  glm: /^glm-(?:4\.(?:5|6)v(?:-flashx?)?|4v(?:-plus)?|5v-turbo)$/,
  kimi: /^kimi-(?:k2\.[56]|k3\.1-pro(?:-highspeed)?)$/,
  doubao: /^doubao-seed-(?:1-6-vision|2-[01]-(?:lite|pro|mini|turbo))-\d{6}$/
};

export function supportsPostPhotos(provider, model) {
  if (provider === 'openai' && model === 'gpt-6.2-sol') return true;
  return visionModels[provider]?.test(model) === true;
}
