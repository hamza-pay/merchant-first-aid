import { MosesLogResult, MosesQueryType } from "../types";

// This mocks the "Moses" system querying "Foxtrot" logs.
// In a real hackathon, this might hit a small Python backend or a real DB.
export const queryMoses = async (merchantId: string, queryType: MosesQueryType): Promise<MosesLogResult> => {
  console.log(`[Moses System] Querying Foxtrot for ${merchantId} with intent ${queryType}...`);
  
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Hackathon logic: Returns different mock data based on simple deterministic rules
  // or randomizing based on the merchant ID to show different scenarios.

  if (queryType === MosesQueryType.FRA_BLOCKS) {
    // Scenario 1: The "Block" scenario
    return {
      sr: 0,
      fra_blocks: 42,
      api_failures: 0,
      last_error_code: "RISK_BLOCK_VELOCITY",
      status: 'CRITICAL'
    };
  }

  if (queryType === MosesQueryType.INTEGRATION_HEALTH) {
    // Scenario 2: The "Bad Integration" scenario
    return {
      sr: 15,
      fra_blocks: 0,
      api_failures: 85,
      last_error_code: "INVALID_SIGNATURE",
      status: 'WARNING'
    };
  }

  // Default: Transaction Stats (Scenario 3: Generic failure or Healthy)
  const isHealthy = Math.random() > 0.5;

  return {
    sr: isHealthy ? 98 : 45,
    fra_blocks: isHealthy ? 0 : 2,
    api_failures: isHealthy ? 1 : 50,
    last_error_code: isHealthy ? null : "GATEWAY_TIMEOUT",
    status: isHealthy ? 'HEALTHY' : 'WARNING'
  };
};