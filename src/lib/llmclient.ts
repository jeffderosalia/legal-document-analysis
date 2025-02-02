import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { 
  HumanMessage, 
  SystemMessage, 
  AIMessage,
  BaseMessage 
} from "@langchain/core/messages";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { StreamingCallback, StreamingCallbackEnd, Provider, Message, ChatOptions  } from "../types";

// Streaming handler class
class StreamingHandler extends BaseCallbackHandler {
    get name(): string {
        return "StreamingHandler";
    }
    constructor(private onToken: StreamingCallback, private onComplete?: StreamingCallbackEnd) {
      super();
    }
  
    async handleLLMNewToken(token: string) {
      this.onToken(token);
    }
    async handleLLMStart(): Promise<void> {}
    async handleLLMEnd(): Promise<void> {
      if (this.onComplete) {
        this.onComplete();
      }
    }   async handleLLMError(): Promise<void> {}
    async handleChainStart(): Promise<void> {}
    async handleChainEnd(): Promise<void> {}
    async handleChainError(): Promise<void> {}
    async handleToolStart(): Promise<void> {}
    async handleToolEnd(): Promise<void> {}
    async handleToolError(): Promise<void> {}
}
  

export async function chat(
  provider: Provider,
  model: string,
  messages: Message[],
  apiKey: string,
  options: ChatOptions = {}
) {
  const { 
    streaming = false, 
    temperature = 1, 
    onToken,
    onComplete
  } = options;

  // Convert messages to LangChain format
  const langchainMessages: BaseMessage[] = messages.map(msg => {
    switch (msg.role) {
      case "system":
        return new SystemMessage(msg.content);
      case "user":
        return new HumanMessage(msg.content);
      case "assistant":
        return new AIMessage(msg.content);
      default:
        throw new Error(`Unsupported message role: ${msg.role}`);
    }
  });

  // Setup model based on provider
  const model_instance = provider === "openai" 
    ? new ChatOpenAI({
        modelName: model,
        streaming,
        temperature,
        openAIApiKey: apiKey,
      })
    : new ChatAnthropic({
        modelName: model,
        streaming,
        temperature,
        anthropicApiKey: apiKey,
      });

  // Setup streaming handler if needed
  const callbacks = streaming && onToken 
    ? [new StreamingHandler(onToken, onComplete)]
    : undefined;

  try {
    const response = await model_instance.invoke(langchainMessages, { callbacks });
    return response.content;
  } catch (error) {
    console.error(`Error with ${provider}:`, error);
    throw error;
  }
};
