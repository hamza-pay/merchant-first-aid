import { GoogleGenAI, FunctionDeclaration, Type, Tool } from "@google/genai";
import { MosesQueryType, MosesLogResult } from "../types";
import { queryMoses } from "./moses";

// --- Configuration ---
const MODEL_NAME = "gemini-2.5-flash";

// --- Tools Definition ---
const checkMosesLogsDeclaration: FunctionDeclaration = {
  name: "checkMosesLogs",
  description:
    "Queries the Moses/Foxtrot logging system to check merchant transaction logs, success rates (SR), and block statuses.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      queryType: {
        type: Type.STRING,
        enum: [
          MosesQueryType.TRANSACTION_STATS,
          MosesQueryType.FRA_BLOCKS,
          MosesQueryType.INTEGRATION_HEALTH,
        ],
        description:
          "The type of log analysis to perform based on the user complaint.",
      },
      merchantId: {
        type: Type.STRING,
        description:
          'The merchant identifier (if available, otherwise use "current_merchant").',
      },
    },
    required: ["queryType"],
  },
};

const tools: Tool[] = [{ functionDeclarations: [checkMosesLogsDeclaration] }];

// --- Service Class ---
class MerchantFirstAidService {
  private ai: GoogleGenAI;
  private chatSession: any;

  constructor() {
    // Ensure API Key is present.
    // Note: In Vite, use import.meta.env.VITE_API_KEY.
    // Check if process.env is defined (Node) or fallback to Vite style for local dev.
    const apiKey =
      process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY;

    if (!apiKey) {
      console.error("API_KEY is missing. Set VITE_API_KEY in .env");
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || "" });
  }

  // Initialize a new chat session with specific system instructions
  startNewSession() {
    this.chatSession = this.ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: `
          You are 'PhonePe MerchantBot', a specialized Level 1 Support AI for a Payment Gateway.
          Your goal is to diagnose merchant issues by querying the 'Moses' logging tool (via the checkMosesLogs tool).

          Process:
          1. Listen to the merchant's complaint.
          2. IF the complaint involves failed transactions, blocks, or integration errors, YOU MUST use the 'checkMosesLogs' tool to investigate before answering.
          3. Interpret the JSON result from Moses and explain it simply to the merchant.
          4. If the logs show a critical error (like FRA_BLOCK or INVALID_SIGNATURE), explain the specific reason.
          5. Be concise, professional, and empathetic.
          
          Important:
          - If SR (Success Rate) is 0, it's critical.
          - If fra_blocks > 0, tell them they triggered a Risk Rule.
          - If last_error_code is 'INVALID_SIGNATURE', tell them to check their secret keys.
        `,
        tools: tools,
      },
    });
  }

  // Main interaction loop
  async sendMessage(
    userMessage: string,
    onToolCall?: (toolName: string, result: string) => void
  ): Promise<string> {
    if (!this.chatSession) this.startNewSession();

    try {
      // 1. Send message to model
      let result = await this.chatSession.sendMessage({ message: userMessage });

      // 2. Loop to handle potential function calls (Model might want to think, then call tool, then think again)
      // Gemini 2.5 Flash handles tool calls via the `functionCalls` property in the response.

      while (result.functionCalls && result.functionCalls.length > 0) {
        const call = result.functionCalls[0]; // Assuming single tool call for simplicity

        // Execute the mock function
        if (call.name === "checkMosesLogs") {
          const args = call.args as any;
          const queryType = args.queryType as MosesQueryType;
          const merchantId = args.merchantId || "current_merchant";

          // Notify UI that we are running a tool
          if (onToolCall)
            onToolCall(
              "Moses System (Foxtrot Logs)",
              `Querying ${queryType}...`
            );

          // Call the mock service
          const toolResult: MosesLogResult = await queryMoses(
            merchantId,
            queryType
          );
          const toolResultStr = JSON.stringify(toolResult);

          if (onToolCall)
            onToolCall(
              "Moses System (Foxtrot Logs)",
              `Result: ${toolResultStr}`
            );

          // Send the tool output back to Gemini
          // FIXED: Use `functionResponse` instead of `toolResponse` structure for Chat.sendMessage
          result = await this.chatSession.sendMessage({
            message: [
              {
                functionResponse: {
                  name: call.name,
                  response: { result: toolResult },
                },
              },
            ],
          });
        }
      }

      // 3. Return final text response
      return result.text;
    } catch (error) {
      console.error("Gemini Error:", error);
      return "I'm having trouble connecting to the diagnostic server. Please contact human support.";
    }
  }

  // Generate a summary for the Freshdesk Ticket (Private Note)
  async generateTicketSummary(
    chatHistory: { role: string; text: string }[]
  ): Promise<string> {
    const historyText = chatHistory
      .map((m) => `${m.role}: ${m.text}`)
      .join("\n");

    const summaryModel = this.ai.models;
    const response = await summaryModel.generateContent({
      model: MODEL_NAME,
      contents: `
        Analyze the following chat transcript between a Merchant and the Diagnostic Bot.
        Generate a concise "Private Note" for a Level 1 Support Agent (Freshdesk).
        
        Format:
        ISSUE: [1 sentence]
        DIAGNOSIS: [What did the Moses logs say?]
        ACTION: [What should the agent do?]
        
        Transcript:
        ${historyText}
      `,
    });

    return response.text;
  }
}

export const merchantFirstAidService = new MerchantFirstAidService();
