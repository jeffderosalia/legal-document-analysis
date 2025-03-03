import { ChatAnthropic } from "@langchain/anthropic";
import { MessageGroup } from "../types";
import { HumanMessage } from "@langchain/core/messages";


async function maybeStoreMemories(message: MessageGroup): Promise<string | undefined> {

    const model = new ChatAnthropic({
        modelName: "claude-3-7-sonnet-20250219",
        anthropicApiKey: process.env.VITE_ANTHROPIC_API_KEY,
        temperature: .5,
    })


    const memoryPrompt = `
        You are a lawyer helping another more experienced lawyer draft a document. You are trying to learn how to improve
        your own document drafting skills. To that end, examine part of your conversation with the other lawyer and determine if they have expressed any preferences or given any instructions that should be remembered for later. Examples would include assertions that particular sorts of information are relevant, that a certain format should be used to describe certain things, that something is unimportant and should be omitted,  what areas you should focus on, or any other sort of advice, instruction, or implicitly expressed preference.

        Return your response in valid JSON in the following form: 

        {"memory": [what you should remember for later]}

        If there is nothing in the message you should remember, memory should be null. If your counterparty just asked you to do something general, asked a question, or said something else that's only transiently important, you don't need to remember anything
        
        Here is the message you should examine:
        
        ${message.question.content}`

        console.log(`memoryPrompt: ${memoryPrompt}`)

        const langchainMessages = [new HumanMessage(memoryPrompt)]

        //console.log(`Prompt for section ${section.section_name}\n\n${allMessages.map(x => x.content).join("\n\n")}`)

        const memoryResult = await model.invoke(langchainMessages)

        console.log(`memoryResult: ${memoryResult.content}`)

        return memoryResult.content as string

}

export {maybeStoreMemories}