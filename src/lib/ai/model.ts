const CURRENT_AI_MODEL = "inclusionai/ling-3.0-flash-vl";
const RETIRED_FREE_MODEL = "inclusionai/ling-3.0-flash-vl-free";

export function getAiModel() {
  const configuredModel = process.env.AI_MODEL?.trim();

  if (!configuredModel || configuredModel === RETIRED_FREE_MODEL) {
    return CURRENT_AI_MODEL;
  }

  return configuredModel;
}

export const freeGatewayOptions = {
  gateway: {
    has: ["free"],
  },
} as const;
