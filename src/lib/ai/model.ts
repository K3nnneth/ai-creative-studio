const CURRENT_AI_MODEL = "inclusionai/ling-3.1-flash";
const RETIRED_AI_MODELS = new Set([
  "inclusionai/ling-3.0-flash-vl",
  "inclusionai/ling-3.0-flash-vl-free",
]);

export function getAiModel() {
  const configuredModel = process.env.AI_MODEL?.trim();

  if (!configuredModel || RETIRED_AI_MODELS.has(configuredModel)) {
    return CURRENT_AI_MODEL;
  }

  return configuredModel;
}

export const freeGatewayOptions = {
  gateway: {
    has: ["free"],
    models: ["stealth/glyph-cluster", "convaiinnovations/laya"],
  },
} as const;
