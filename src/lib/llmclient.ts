import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";
import { ChatAnthropic, ChatAnthropicCallOptions } from "@langchain/anthropic";
import { 
  HumanMessage,
  AIMessage,
  BaseMessage, 
  AIMessageChunk,
  ToolMessage,
} from "@langchain/core/messages";
import { BaseCallbackHandler, HandleLLMNewTokenCallbackFields, NewTokenIndices } from "@langchain/core/callbacks/base";
import { StreamingCallback, StreamingCallbackEnd, StreamingError, Message, ChatOptions, ToolCallbackStart, ToolCallbackEnd, UIProvider  } from "../types";
import { invokeWithExample } from "./gen_with_example";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { Serialized } from "@langchain/core/load/serializable";

// Streaming handler class
class StreamingHandler extends BaseCallbackHandler {
    get name(): string {
        return "StreamingHandler";
    }
    constructor(private onToken: StreamingCallback,
                private onComplete?: StreamingCallbackEnd,
                private onError?: StreamingError,
                private onToolStart?: ToolCallbackStart,
                private onToolEnd?: ToolCallbackEnd) {
      super();
    }
  
    async handleLLMNewToken(
      token: string,
      idx: NewTokenIndices,
      runId: string,
      parentRunId?: string | undefined,
      tags?: string[] | undefined,
      fields?: HandleLLMNewTokenCallbackFields | undefined) {
        this.onToken(token, idx, runId, parentRunId, tags, fields);
    }

    async handleLLMStart(): Promise<void> {}

    async handleLLMEnd(): Promise<void> {
      if (this.onComplete) this.onComplete();
    }

    async handleLLMError(error: Error): Promise<void> {
      if (this.onError) this.onError(error);
    }

    async handleChainStart(): Promise<void> {}
    async handleChainEnd(): Promise<void> {}
    async handleChainError(): Promise<void> {}

    async handleToolStart(
      tool: Serialized,
      input: string,
      runId: string,
      parentRunId: string,
      tags: string[])
      : Promise<void> {
        if (this.onToolStart) {
          this.onToolStart(tool, input, runId, parentRunId, tags)
        }
    }

    async handleToolEnd(
      output: ToolMessage,
      runId: string,
      parentRunId?: string | undefined,
      tags?: string[] | undefined)
      : Promise<void> {
        console.log('handleToolEnd');
        if (this.onToolEnd) {
          console.log('invoke onToolEnd');

          this.onToolEnd(output, runId, parentRunId, tags)
        }
    }

    async handleToolError(error: Error): Promise<void> {
      console.log('handleToolError');
      if (this.onError) this.onError(error);
    }
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
  uiProvider: UIProvider,
  messages: Message[],
  mediaItems: string[],
  apiKey: string,
  historyString: string,
  memories: string,
  options: ChatOptions = {}
) {
  const { 
    streaming = false,
    onToken,
    onComplete,
    onError,
    onToolStart,
    onToolEnd
  } = options;

  // Convert messages to LangChain format
  var langchainMessages: BaseMessage[] = messages.map(msg => {
    switch (msg.role) {
      case "system":
        return new HumanMessage(msg.content);
      case "user":
        return new HumanMessage(msg.content);
      case "assistant":
        return new AIMessage(msg.content);
      default:
        throw new Error(`Unsupported message role: ${msg.role}`);
    }
  });

  // Setup model based on provider, note that anything not "openai" falls through to Anthropic
  const model_instance = uiProvider.provider === "openai"
    ? new ChatOpenAI({
        modelName: uiProvider.model,
        streaming,
        openAIApiKey: apiKey,
      })
    : new ChatAnthropic({
        modelName: uiProvider.model,
        streaming,
        anthropicApiKey: apiKey,
        maxTokens: 8192
      });

  // Setup streaming handler if needed
  const callbacks = streaming && onToken 
    ? [new StreamingHandler(onToken, onComplete, onError, onToolStart, onToolEnd)]
    : undefined;

  try {
    if (uiProvider.useTool){
      const response = await invokeWithExample(model_instance, langchainMessages, mediaItems, historyString, memories, { callbacks });
      return response?.content;
    } else {
      //console.log('allMessages', langchainMessages)
      const response = await basic_invoke(model_instance, langchainMessages, { callbacks });
      return response.content;
    }
  } catch (error) {
    console.error(`Error with ${uiProvider.id}:`, error);
    //throw error;
  }
};
