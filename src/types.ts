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
}
  