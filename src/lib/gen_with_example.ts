import {
    constructPromptMaybeWithSelectedDocuments,
    getDomainSpecificPromptInstr,
    getDomainSpecificOutlineTemplate
} from "@legal-document-analysis/sdk";
import { z } from "zod";

import client from "./client";
import { ChatAnthropic, ChatAnthropicCallOptions } from "@langchain/anthropic";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { AIMessage, BaseMessage, HumanMessage} from "@langchain/core/messages";
import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";
import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools"


// const getExampleDocText = async () : Promise<string | undefined> => {
//     const result = await client(ExtractedExampleText).where({mediaItemRid: {$eq: "ri.mio.main.media-item.0195244c-7091-7fd9-8893-4d020e600bb5" }}).fetchPage()
//     const doc = result.data.pop()
//     return doc?.rawText
// }

const toolStartMessages: Record<string, string> = {"memoCreator": "Creating memo"}

const Section = z.object({
    section_name: z.string().describe("The name of the section"),
    section_description: z.string().describe("A short description of the type of content to be included in each section sufficient as instruction to fill in with more detail later"),
    section_formatting: z.string().describe("A description of the structure and format of each section (tables, bullet points, etc)")
})

type Section = {
    section_name: string
    section_description: string
    section_formatting: string
}

//const Outline = z.object({sections: z.array(Section).describe("List of sections")})

const depositionSchema = z.object({
    depositionSubject: z.string().describe("The person being deposed")
  });


async function generateSection(section: Section, mediaItems: string[], config?: RunnableConfig){

    console.log(`Generating section: ${section.section_name}`)

    const section_model = new ChatOpenAI({
        modelName: "gpt-4o",
        streaming: true,
        openAIApiKey: process.env.VITE_OPENAI_API_KEY,
    })

    const prompt = `Write the following section of a deposition summary: ${section.section_name}.
                    Use only the information in the document excerpts provided.
                    Make sure to be comprehensive and complete.
                    Here's a description of the section contents:

                    ${section.section_description}

                    The format should be:

                    ${section.section_formatting}

                    Make sure your summary contains all the details that a client or a new team member
                    on the defense team would use to understand the full case.

                    Write the summary at a PhD level.

                    Make sure to format your answer with markdown, 
                    and make sure to ALWAYS lead with two newlines
                    followed by the section name (${section.section_name})
                    as the heading. Always end with two newlines.
                    Do not offer any editorial opinion or analysis, and do not include any sort of
                    post-script or conclusion paragraph. Only summarize and collate what is found in the
                    document excerpts. Do not treat any statements in the deposition as factual, and do not imply
                    that they are true. Only state what was said and claimed by the deposed.
                    
                    Even if otherwise instructed, instead of providing citations in-line simply give a citation
                    number (i.e. [1], [2], etc, in turn) and then provide the source at the end of the section,
                    formatted to show just the volume and page of the relevant document. Do NOT show the full filename, just its volume number and the page. An example would be:

                    ...
                    Statement that includes a cited source [4]
                    ...

                    [4]: Vol. 2 Page 56

                    When you write out the citations, you don't need to put a line break between them, they can be all in one line, like so:
                    [1]: Vol. 1 Page 100, [2]: Vol 3. Page 10, [3]: Vol 2. Page 15...`

                    + await client(getDomainSpecificPromptInstr).executeFunction()

    // console.log("Section prompt:")
    // console.log(prompt)

    const constructedPromptMessages = await client(constructPromptMaybeWithSelectedDocuments).executeFunction({
        "question": prompt,
        "history_string": '',
        "media_items": mediaItems,
        "k": 150 // Max number of document chunks to retrieve
    })

    var langchainMessages: BaseMessage[] = constructedPromptMessages.map(msg => {
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
    })

    return await section_model.invoke(langchainMessages, config)
}


async function generateDepoSummary(depositionSubject: string, mediaItems: string[], config?: RunnableConfig){

    console.log(`Generating deposition summary for ${depositionSubject}`)

    // const model = new ChatAnthropic({
    //     modelName: "claude-3-5-sonnet-20241022",
    //     anthropicApiKey: process.env.VITE_ANTHROPIC_API_KEY,
    //     maxTokens: 8192
    // })

    // const structured_model = model.withStructuredOutput(Outline, {"name": "Outline"})

    // const example = await getExampleDocText()

    // var exampleText = ""
    // if (example !== undefined) {
    //     console.log(`Got example text of length: ${example.length}`)

    //     exampleText = "Make sure to write in the same style as the following example document. Use the same structure, "+
    //         "organization and order of presentation of information, and detail. Make absolutely sure not to use any of the actual information from the example, "+
    //         "only use information present in the relevant transcript pages. The example is just to show how your answer should be structured and presented. "+
    //         "Here is the example document:\n\n"+
    //         example
    // }
    
    // const get_outline_prompt = `Create an outline of a deposition summary for the deposition of ${depositionSubject}, based on the example deposition summary provided. Give a list of sections, a short description of the type of content to be included in each section sufficient as instruction to fill it with more detail later, and a description of the structure and format of each section (tables, bullet points, etc). The miscellaneous section should not have any information present in other sections. Respond with valid JSON formatted as follows:\n\n[{{\"section_name\": SECTION_NAME, \"section_description\": SECTION_DESCRIPTION \"section_formatting\": SECTION_FORMATTING}}...]`

    // const prompt_template = ChatPromptTemplate.fromMessages([
    //     ["user", exampleText],
    //     ["user", get_outline_prompt]
    // ])

    // console.log("Outline and example prompt")
    // console.log(prompt_template)

    // const get_outline_chain = prompt_template.pipe(structured_model)
    // const outline = await get_outline_chain.invoke({depositionSubject})

    // console.log("Outline:")
    // console.log(outline)

    // outline from fn

    const outline = JSON.parse(await client(getDomainSpecificOutlineTemplate).executeFunction())

    console.log("Outline")
    console.log(outline)

    var sections = []

    // One at a time or we'll get 429s
    for (var i = 0; i < outline.sections.length; i++) {
        if (outline.sections[i] != null) {
            var written_section = await generateSection(outline.sections[i], mediaItems, config)
            sections.push(written_section)
        }
    }
    
    console.log("sections:")
    console.log(sections)

    console.log(sections.join("\n\n"))
}


// async function invokeWithExample(
//     model_instance: ChatOpenAI<ChatOpenAICallOptions> | ChatAnthropic,
//     messages: BaseLanguageModelInput,
//     mediaItems: string[],
//     options: ChatOpenAICallOptions & ChatAnthropicCallOptions
//   ) {

//     const memoCreator = tool(
//         async ({trial}, config?: RunnableConfig) : Promise<void> => {
//             await generateMemo(trial, mediaItems, config)
//         },
//         {
//             name: "memoCreator",
//             description: "Use this if asked to generate a memo about a trial",
//             schema: memoSchema,
//         }
//     )

//     const model_with_tools = model_instance.bindTools([memoCreator])

//     const tool_call = await model_with_tools.invoke(messages)
//     options.tags = ["startingMemoGen"]

//     if (tool_call.tool_calls !== undefined && tool_call.tool_calls.length > 0) {
//         memoCreator.stream(tool_call.tool_calls[0], options)
//         return undefined
//     }

//     return tool_call
// }


async function invokeWithExample(
    model_instance: ChatOpenAI<ChatOpenAICallOptions> | ChatAnthropic,
    messages: BaseLanguageModelInput,
    mediaItems: string[],
    options: ChatOpenAICallOptions & ChatAnthropicCallOptions
  ) {

    const depositionSummaryCreator = tool(
        async ({depositionSubject}, config?: RunnableConfig) : Promise<void> => {
            await generateDepoSummary(depositionSubject, mediaItems, config)
        },
        {
            name: "depositionSummaryCreator",
            description: "Use this if asked to write a deposition summary",
            schema: depositionSchema,
        }
    )

    const model_with_tools = model_instance.bindTools([depositionSummaryCreator])

    const tool_call = await model_with_tools.invoke(messages)
    options.tags = ["startingMemoGen"]

    if (tool_call.tool_calls !== undefined && tool_call.tool_calls.length > 0) {
        depositionSummaryCreator.stream(tool_call.tool_calls[0], options)
        return undefined
    }

    return tool_call
}


export {invokeWithExample, toolStartMessages}
