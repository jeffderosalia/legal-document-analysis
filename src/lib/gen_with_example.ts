import {
    constructPromptMaybeWithSelectedDocuments,
    getDomainSpecificPromptInstr,
    getDomainSpecificOutlineTemplate,
    ExtractedExampleText
} from "@legal-document-analysis/sdk";
import { z } from "zod";

import client from "./client";
import { ChatAnthropic, ChatAnthropicCallOptions } from "@langchain/anthropic";
import { AIMessage, AIMessageChunk, BaseMessage, HumanMessage} from "@langchain/core/messages";
import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";
import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools"
import { estimateMaxDocuments } from "./osdk";


const getExampleDocText = async () : Promise<string | undefined> => {
    const result = await client(ExtractedExampleText).where({mediaItemRid: {$eq: "ri.mio.main.media-item.0195244c-7091-7fd9-8893-4d020e600bb5" }}).fetchPage()
    const doc = result.data.pop()
    return doc?.rawText
}

const Section = z.object({
    section_name: z.string().describe("The name of the section"),
    section_description: z.string().describe("A description of the type of content to be included in each section sufficient as instruction to fill in with more detail later"),
    section_formatting: z.string().describe("A description of the structure and format of each section (tables, bullet points, etc)")
})

type Section = {
    section_name: string
    section_description: string
    section_formatting: string
}

const Outline = z.object({sections: z.array(Section).describe("List of sections")})

const depositionSchema = z.object({
    depositionSubject: z.string().describe("The person being deposed")
  });


async function generateSection(section: Section, mediaItems: string[], sectionsSoFar: AIMessageChunk[], historyString: string, config?: RunnableConfig){

    console.log(`Generating section: ${section.section_name}`)

    const maxTokens = 128000
    const section_model = new ChatOpenAI({
        modelName: "gpt-4o",
        streaming: true,
        openAIApiKey: process.env.VITE_OPENAI_API_KEY,
        maxTokens: -1
    })

    const sectionsGeneratedMessages = sectionsSoFar.map(m => new AIMessage(m.content as string))

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
                    and make sure to ALWAYS lead with a new paragraph (separated with at least two newlines of white space)
                    followed by the section name (${section.section_name})
                    as the heading. Always end with two newlines.
                    Do not offer any editorial opinion or analysis, and do not include any sort of
                    post-script or conclusion paragraph. Only summarize and collate what is found in the
                    document excerpts. Do not treat any statements in the deposition as factual, and do not imply
                    that they are true. Only state what was said and claimed by the deposed.

                    Always use precise language. Do not vacillate or hedge. If there is any ambiguity, point it out and present the reasons for it. Do not try to explain or justify the ambiguity, just present the sources of it. Make sure to focus on and draw from the actual content of the document, rather than making any assumptions.

                    If there is conflicting information, don't attempt to synthesize it. Just explain each place the information is found, quoting it if appropriate. It is important to know where the conflicts are, but not to resolve them. You should always explicitly point out any conflicts or contradictory information.

                    Use quotations from the sources whenever specific information has been asked for, or whenever else it is appropriate. Any key statements should be quoted.

                    If some feedback was given on how to generate a particular section, make sure to follow it.

                    If you're regenerating a section that has been written before, try to keep to the same wording unless the instructions for that section changed, or if you have new information.

                    Do not give any sort of strategic advice. Focus on precise summarization. 

                    Don't include information duplicated in prior sections, except if it's in the background section. Be concise, and make sure not to repeat yourself, but be sure to present complete information. MAKE SURE to NEVER repeat things like demographic information, acronym definitions, or any parenthetical notes.
                    
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

    const sectionsSoFarTokens = Math.floor(sectionsGeneratedMessages.map(m => m.content.length).reduce((x, y) => x + y, 0) / 4)

    const k = await estimateMaxDocuments(section.section_description, historyString, maxTokens - sectionsSoFarTokens)
    console.log(`Got ${k} docs for section ${section.section_name}`)

    const constructedPromptMessages = await client(constructPromptMaybeWithSelectedDocuments).executeFunction({
        "question": section.section_description,
        "history_string": historyString,
        "media_items": mediaItems,
        "k": k // Max number of document chunks to retrieve
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

    langchainMessages.push(new HumanMessage(prompt))

    const allMessages = sectionsGeneratedMessages.concat(langchainMessages)

    //console.log(`Prompt for section ${section.section_name}\n\n${allMessages.map(x => x.content).join("\n\n")}`)

    return await section_model.invoke(allMessages, config)
}


async function generateDepoSummary(depositionSubject: string, mediaItems: string[], historyString: string, config?: RunnableConfig){

    console.log(`Generating deposition summary for ${depositionSubject}`)

    const model = new ChatAnthropic({
        modelName: "claude-3-7-sonnet-20250219",
        anthropicApiKey: process.env.VITE_ANTHROPIC_API_KEY,
        temperature: .5,
    })

    const structured_model = model.withStructuredOutput(Outline, {"name": "Outline"})

    const example = await getExampleDocText()

    var exampleText = ""
    if (example !== undefined) {
        console.log(`Got example text of length: ${example.length}`)

        exampleText = "Make sure to write in the same style as the following example document. Use the same structure, "+
            "organization and order of presentation of information, and detail. Make absolutely sure not to use any of the actual information from the example, "+
            "only use information present in the relevant transcript pages. The example is just to show how your answer should be structured and presented. "+
            "Here is the example document:\n\n"+
            example
    }

    const sampleOutline = await client(getDomainSpecificOutlineTemplate).executeFunction()

    const get_outline_prompt = `Create an outline of a deposition summary for the deposition of ${depositionSubject}, based on the example deposition summary provided. Give a list of sections, a short description of the type of content to be included in each section sufficient as instruction to fill it with more detail later, and a description of the structure and format of each section (tables, bullet points, etc). The miscellaneous section should not have any information present in other sections. NEVER include a "Witness Impressions" section. There is also no need for a table of depositions, since you are only summarizing a single one. Respond with valid JSON formatted as follows:\n\n[{{\"section_name\": SECTION_NAME, \"section_description\": SECTION_DESCRIPTION \"section_formatting\": SECTION_FORMATTING}}...]
    
    Here is a basic outline, which is appropriate to use in the general case. If you've been asked to include or exclude certain sections, MAKE SURE to edit the basic outline as appropriate. Include any specific instructions given for each section, and any general information that should be kept in mind. You should infer instructions that were given implicitly, too. For instance, if the user has asked to have a section rewritten following a particular style or keeping in mind particular information, make sure to include instructions to that effect in the outline you generate. Make sure to go into detail in the section descriptions, especially if you've previously been asked to revise a section.

    The basic outline:

    ${sampleOutline}`


    const outlinePromptMessages = [new HumanMessage(historyString), new HumanMessage(exampleText), new HumanMessage(get_outline_prompt)]

    // console.log("Outline prompt")
    // console.log(outlinePromptMessages)

    const outline = await structured_model.invoke(outlinePromptMessages)

    console.log("Outline:")
    console.log(outline)

    var sections = []

    // One at a time or we'll get 429s
    for (var i = 0; i < outline.sections.length; i++) {
        if (outline.sections[i] != null) {
            var written_section = await generateSection(outline.sections[i], mediaItems, sections, historyString, config)
            sections.push(written_section)
        }
    }

    console.log("Summary generation complete")
}


async function invokeWithExample(
    model_instance: ChatOpenAI<ChatOpenAICallOptions> | ChatAnthropic,
    messages: BaseMessage[],
    mediaItems: string[],
    historyString: string,
    options: ChatOpenAICallOptions & ChatAnthropicCallOptions
  ) {

    const depositionSummaryCreator = tool(
        async ({depositionSubject}, config?: RunnableConfig) : Promise<void> => {
            await generateDepoSummary(depositionSubject, mediaItems, historyString, config)
        },
        {
            name: "depositionSummaryCreator",
            description: `Use this if asked to write a deposition summary. Only use it if explicitly asked to rewrite the whole summary,
            not if you're just asked to rewrite a particular section or answer some question or another.`,
            schema: depositionSchema,
        }
    )

    const model_with_tools = model_instance.bindTools([depositionSummaryCreator])

    const summaryPrompt = `If you are asked to write a deposition summary, use the appropriate tool. Don't say the name of the tool you're invoking, just tell the user that you're going to write the summary, and let them know it might take you a minute to do so. Recount for them any specific instructions you are keeping in mind, especially anything related to the content or form of particular sections. Be brief, but be sure to address each point of feedback they have given you. If you're asked to rewrite just a single section, you don't need to call the tool -- just rewrite it for them. Only call the tool to write a whole summary afresh or to rewrite the whole of the summary when explicitly asked to.`

    const messagesWithSummary = [new HumanMessage(summaryPrompt)].concat(messages)

    const tool_call = await model_with_tools.invoke(messagesWithSummary, options)
    options.tags = ["startingDepoSummaryGen"]

    if (tool_call.tool_calls !== undefined && tool_call.tool_calls.length > 0) {
        depositionSummaryCreator.stream(tool_call.tool_calls[0], options)
        return undefined
    }

    return tool_call
}


export {invokeWithExample}
