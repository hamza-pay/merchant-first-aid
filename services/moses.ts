import { MosesLogResult, MosesQueryType } from "../types";
import { MOSES_CONFIG } from "../config";

// --- Types for API Responses ---
interface OlympusTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// --- Olympus Client (Ported from Python) ---
class OlympusClient {
  private host: string;
  private clientId: string;
  private clientSecret: string;
  private oauthEndpoint = "/olympus/im/v1/oauth/token";

  constructor(host: string, clientId: string, clientSecret: string) {
    this.host = host;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async getAuthHeader(): Promise<string> {
    const url = `${this.host}${this.oauthEndpoint}`;

    // x-www-form-urlencoded body
    const body = new URLSearchParams();
    body.append("grant_type", "client_credentials");
    body.append("client_id", this.clientId);
    body.append("client_secret", this.clientSecret);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body,
      });

      if (!response.ok) {
        throw new Error(`Olympus Auth Failed: ${response.statusText}`);
      }

      const data: OlympusTokenResponse = await response.json();
      return `O-Bearer ${data.access_token}`;
    } catch (error) {
      console.error("Unable to login to OlympusIM", error);
      throw error;
    }
  }
}

// --- Moses Client (Ported from Python) ---
class MosesClient {
  private host: string;
  private mosesEndpoint = "/v2/fql/extrapolation";
  private mosesAnalyticsEndpoint = "/v2/analytics";
  private olympusClient: OlympusClient;

  constructor(host: string, olympusClient: OlympusClient) {
    this.host = host;
    this.olympusClient = olympusClient;
  }

  async execute(fql: any): Promise<any> {
    try {
      // 1. Get Token
      const authToken = await this.olympusClient.getAuthHeader();
      // Alternatively, use a hardcoded token if auth is tricky during hackathon:
      // const authToken = "O-Bearer YOUR_HARDCODED_TOKEN";

      const url = `${this.host}${this.mosesAnalyticsEndpoint}`;

      const headers = {
        Authorization: authToken,
        "Content-Type": "application/json",
        "X-APP-ID": "echo",
        "X-Client-Id": "echo",
      };

      console.log("Request going to moses:", JSON.stringify(fql, null, 4));

      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(fql),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Moses Request Failed:", errorText);
        throw new Error(`FQL Failed with response code ${response.status}`);
      }

      const data = await response.json();
      console.debug("Moses request executed successfully", data);
      return data;
    } catch (error) {
      console.error("Error executing Moses query:", error);
      throw error;
    }
  }
}

// --- Helper to map Hackathon Query Types to actual FQL JSON ---
// You will populate this part with the actual queries later.
const getFqlForQueryType = (
  merchantId: string,
  queryType: MosesQueryType
): any => {
  // Placeholder FQL structure
  const baseFql = {
    query: "PLACEHOLDER_FQL",
    merchant_id: merchantId,
    intent: queryType,
  };

  switch (queryType) {
    case MosesQueryType.TRANSACTION_STATS:
      return { ...baseFql, _comment: "Add FQL for last 10 days SR here" };
    case MosesQueryType.FRA_BLOCKS:
      return { ...baseFql, _comment: "Add FQL for Risk/FRA blocks here" };
    case MosesQueryType.INTEGRATION_HEALTH:
      return { ...baseFql, _comment: "Add FQL for API failures here" };
    default:
      return baseFql;
  }
};

// --- Main Service Function ---

// Initialize Clients
const olympus = new OlympusClient(
  MOSES_CONFIG.olympusHost,
  MOSES_CONFIG.clientId,
  MOSES_CONFIG.clientSecret
);
const moses = new MosesClient(MOSES_CONFIG.mosesHost, olympus);

export const queryMoses = async (
  merchantId: string,
  queryType: MosesQueryType
): Promise<MosesLogResult> => {
  console.log(
    `[Moses System] Processing ${merchantId} with intent ${queryType}...`
  );

  // Fallback to Mock Data if configured or if hosts are missing
  if (MOSES_CONFIG.useMockData || !MOSES_CONFIG.mosesHost) {
    console.warn("Using Mock Data (Check config.ts to enable real API)");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return getMockData(queryType);
  }

  try {
    // 1. Get the FQL Query Object
    const fql = getFqlForQueryType(merchantId, queryType);

    // 2. Execute against real Moses API
    const rawResult = await moses.execute(fql);

    // 3. Transform the raw FQL result into our App's internal data format (MosesLogResult)
    // You will likely need to adjust this mapping once you see the real FQL response structure.
    return {
      sr: rawResult.sr || 0,
      fra_blocks: rawResult.fra_blocks || 0,
      api_failures: rawResult.api_failures || 0,
      last_error_code: rawResult.error_code || null,
      status: rawResult.status || "WARNING",
    };
  } catch (error) {
    console.error(
      "Failed to query real Moses API, falling back to mock.",
      error
    );
    return getMockData(queryType);
  }
};

// --- Mock Data Generator (Kept for fallback/demo) ---
const getMockData = (queryType: MosesQueryType): MosesLogResult => {
  if (queryType === MosesQueryType.FRA_BLOCKS) {
    return {
      sr: 0,
      fra_blocks: 42,
      api_failures: 0,
      last_error_code: "RISK_BLOCK_VELOCITY",
      status: "CRITICAL",
    };
  }
  if (queryType === MosesQueryType.INTEGRATION_HEALTH) {
    return {
      sr: 15,
      fra_blocks: 0,
      api_failures: 85,
      last_error_code: "INVALID_SIGNATURE",
      status: "WARNING",
    };
  }
  const isHealthy = Math.random() > 0.5;
  return {
    sr: isHealthy ? 98 : 45,
    fra_blocks: isHealthy ? 0 : 2,
    api_failures: isHealthy ? 1 : 50,
    last_error_code: isHealthy ? null : "GATEWAY_TIMEOUT",
    status: isHealthy ? "HEALTHY" : "WARNING",
  };
};
