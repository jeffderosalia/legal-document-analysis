import OpenAI from 'openai';
import { Stream } from 'openai/streaming';
import { ChatCompletionChunk, ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const apiKey = import.meta.env.VITE_OPENAI_KEY;


export async function processDocument(
  messages: ChatCompletionMessageParam[]
): Promise<Stream<ChatCompletionChunk>> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  /*
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: `Document: ${docText}\n\nQuery: ${query}` }
  ];*/
  const stream = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages,
    stream: true,
  });
  return stream;
}