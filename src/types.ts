import { Serialized } from "@langchain/core/load/serializable";
import { ToolMessage } from "@langchain/core/messages";

export interface Document {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: Document[];
}

export interface DocumentNode extends Document {
  children: DocumentNode[];
}
export type Provider = "openai" | "anthropic" | "anthropic_with_example";

export type StreamingCallback = (token: string) => void;
export type StreamingCallbackEnd = () => void;
export type StreamingError = (error: Error) => void;

export type ToolCallbackStart = (
  tool: Serialized,
  input: string,
  runId: string,
  parentRunId: string,
  tags: string[]) => void;
export type ToolCallbackEnd = (
  output: ToolMessage,
  runId: string,
  parentRunId?: string | undefined,
  tags?: string[] | undefined) => void;

export type MessageRole = "system" | "user" | "assistant";

export interface OSDKMessage {
  type: MessageRole;
  content: string;
}

export interface Message {
  role: MessageRole;
  content: string;
  provider?: string;
}

export interface MessageGroup {
  groupId?: string;
  question: Message;
  answers: Message[];
  when: Date
}

export interface ChatOptions {
  streaming?: boolean;
  temperature?: number;
  onToken?: StreamingCallback;
  onComplete?: StreamingCallbackEnd;
  onError?: StreamingError;
  onToolStart?: ToolCallbackStart;
  onToolEnd?: ToolCallbackEnd
}

export type UIProvider = {
  id: 'chatgpt' | 'anthropic' | 'anthropic_with_example';
  provider: Provider;
  model: string;
  name: string;
  enabled: boolean;
  apiKey: string;
}
