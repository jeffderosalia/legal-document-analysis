import { ChatAnthropic } from "@langchain/anthropic";
import { MessageGroup } from "../types";
import { HumanMessage } from "@langchain/core/messages";
import { createAndEmbedMemory, retrieveMemories } from "@legal-document-analysis/sdk";
import client from "./client";
import { v4 as uuidv4 } from 'uuid';


async function uploadMemory(memory: string): Promise<string | undefined> {
    const memoryID = uuidv4()
    try {
        await client(createAndEmbedMemory).applyAction({content: memory,
                                                        id: memoryID,
                                                        uid: "ALL_V1",
                                                        memoryType: "GENERIC_V1"},
                                                        {$returnEdits: true})
        return memoryID
    } catch(error) {
        console.log(`Memory upload error`, error)
        return undefined
    }
}

async function maybeGenerateMemory(message: MessageGroup): Promise<string | undefined> {

    const model = new ChatAnthropic({
        modelName: "claude-3-5-sonnet-20241022",
        anthropicApiKey: process.env.VITE_ANTHROPIC_API_KEY,
        temperature: .5,
    })

    const memoryPrompt = `
        You are a lawyer helping another more experienced lawyer draft a document. You are trying to learn how to improve
        your own document drafting skills. To that end, examine part of your conversation with the other lawyer and determine if they have expressed any preferences or given any instructions that should be remembered for later. Examples would include assertions that particular sorts of information are relevant, that a certain format should be used to describe certain things, that something is unimportant and should be omitted,  what areas you should focus on, or any other sort of advice, instruction, or implicitly expressed preference.

        Return your response in valid JSON in the following form:

        {"memory": what you should remember for later}

        ALWAYS output ONLY valid json. Do not enclose your answer in json tags.

        If there is nothing in the message you should remember, memory should be null. If your counterparty just asked you to do something general, asked a question, or said something else that's only transiently important, you don't need to remember anything

        Here is the message you should examine:

        ${message.question.content}`

        const langchainMessages = [new HumanMessage(memoryPrompt)]

        const memoryResult = await model.invoke(langchainMessages)

        console.log(`memoryResult: ${memoryResult.content}`)

        try {
            const resultJSON = JSON.parse(memoryResult.content as string)
            if (resultJSON["memory"] !== undefined) {
                if (resultJSON["memory"] === null) {
                    console.log("No memory to store")
                    return undefined
                } else {
                    return resultJSON["memory"]
                }
            } else {
                console.log("No memory generated")
                return undefined
            }
        } catch (error) {
            console.log(`Error: `, error);
            return undefined
        }
}

async function maybeStoreMemories(message: MessageGroup): Promise<string | undefined> {
    console.log("Starting memory generation")
    const generatedMemory = await maybeGenerateMemory(message)

    if (generatedMemory !== undefined) {
        console.log(`Uploading memory`)
        const uploaded = await uploadMemory(generatedMemory)
        console.log(`Uploaded: ${uploaded}`)

        if (uploaded === undefined) {
            return undefined
        }

        return generatedMemory
    }

    return undefined
}

async function getMemories(message: MessageGroup): Promise<string> {

    console.log("Retrieving memories")

    const context = message.question.content as string
    const memories = await client(retrieveMemories).executeFunction({context: context,
                                                                     uid: "ALL_V1",
                                                                     memoryType: "GENERIC_V1"})

    console.log(`Got memories: ${memories}`)

    return memories.join("\n")
}


export {maybeStoreMemories, getMemories}