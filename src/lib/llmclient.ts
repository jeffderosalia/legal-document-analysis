import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";
import { ChatAnthropic, ChatAnthropicCallOptions } from "@langchain/anthropic";
import { 
  HumanMessage, 
  SystemMessage, 
  AIMessage,
  BaseMessage, 
  AIMessageChunk,
} from "@langchain/core/messages";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { StreamingCallback, StreamingCallbackEnd, Provider, Message, ChatOptions  } from "../types";
import { invokeWithExample } from "./gen_with_example";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";

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
    async handleToolStart(): Promise<void> {
      console.log("tool started")
    }
    async handleToolEnd(): Promise<void> {
      console.log("tool finished")
    }
    async handleToolError(): Promise<void> {}
}
  
// input: BaseLanguageModelInput, options?: (ChatAnthropicCallOptions & ChatOpenAICallOptions) | undefined
async function basic_invoke(
  model_instance: ChatOpenAI<ChatOpenAICallOptions> | ChatAnthropic,
  messages: BaseLanguageModelInput,
  options: ChatOpenAICallOptions & ChatAnthropicCallOptions
): Promise<AIMessageChunk> {
  return model_instance.invoke(messages, options)
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
  var langchainMessages: BaseMessage[] = messages.map(msg => {
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

  // Setup model based on provider, note that anything not "openai" falls through to Anthropic
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
    if (provider === "anthropic_with_example"){
      const response = await invokeWithExample(model_instance, langchainMessages, { callbacks });
      console.log("Complete doc:")
      console.log(response)
      return response;
    } else {
      const response = await basic_invoke(model_instance, langchainMessages, { callbacks });
      return response.content;
    }
  } catch (error) {
    console.error(`Error with ${provider}:`, error);
    throw error;
  }
};
