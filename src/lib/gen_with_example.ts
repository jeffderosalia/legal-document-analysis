import {
    ExtractedExampleText,
} from "@legal-document-analysis/sdk";
import client from "./client";


const getExampleDocText = async () : Promise<string | undefined> => {
    const result = await client(ExtractedExampleText)
        .fetchPage()
    const doc = result.data.pop()
    return doc?.rawText
}

export {getExampleDocText}
