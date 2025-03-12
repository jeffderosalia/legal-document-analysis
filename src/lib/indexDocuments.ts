import { 
    createUploadedMediaChunk,
    createIndexedDocument,
    extractText,
    UploadedMediaObject
  } from "@legal-document-analysis/sdk";
import client from "./client";
import { OpenAIEmbeddings } from "@langchain/openai";
import assert from "assert";


async function embedChunk(chunkText: string) {

  const embeddingModel = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    openAIApiKey: process.env.VITE_OPENAI_API_KEY
  });

  const vector = await embeddingModel.embedQuery(chunkText)
  return vector

}


async function makeChunkObjectParams(chunkText: string, chunkIndex: number, mediaItemRid: string, path: string){

  const embedding = await embedChunk(chunkText)

  const values = {"chunk_text": chunkText,
                  "annotated_chunk_text": chunkText,
                  "chunk_id": `chunk_TEST_${chunkIndex}`,
                  "media_item_rid": "TEST",
                  "path": path,
                  "pdf_page_number": chunkIndex,
                  "witnesses_mentioned": [],
                  "witnesses_string": "",
                  "chunk_embedding": embedding}

  return values

}


async function uploadDocumentChunks(mediaItemRid: string, path: string, textChunks: string[]) {

  const partialChunkObjectParams = (chunkText: string, chunkIndex: number) => makeChunkObjectParams(chunkText, chunkIndex, mediaItemRid, path)

  console.time("embed")

  const chunkParams = await Promise.all(textChunks.map(partialChunkObjectParams))

  console.timeEnd("embed")

  const batchSize = 1

  console.log("param sample:")
  console.log(chunkParams[0])

  console.log(`Embedded ${chunkParams.length} chunks`)

  var actions = []

  for (let i = 0; i < 2 && chunkParams.length; i += batchSize) {
    const paramsSlice = chunkParams.slice(i, i + batchSize)

    // The max allowed array length is 1000, so just set it lower
    if( !(paramsSlice[0].chunk_embedding.length == 1536))
    {
      throw new Error(`Got embedding of length ${paramsSlice[0].chunk_embedding.length}`)
    }

    const newActions = await client(createUploadedMediaChunk).applyAction(paramsSlice[0], {$validateOnly: false})

    actions.push(newActions)
  }

  console.log(actions)

}


async function uploadIndexedDocument(mediaItemRid: string, path: string, folderID: string | undefined) {

  const edits = await client(createIndexedDocument).applyAction({
    media_item_rid: mediaItemRid,
    path: path, folder_id: folderID
  },
    { $returnEdits: true })

  console.log("Created indexedDocument:")
  console.log(edits)

}

async function indexDocument(uploadedMediaObjectID: string,
  mediaItemRid: string,
  path: string,
  folderID: string | undefined = undefined) {


  console.log("Beginning indexing")
  console.time("indexing")

  const textChunks = await client(extractText).executeFunction({uploadedMediaObjectKey: uploadedMediaObjectID})

  console.log("Got document text chunks")

  const uploadedMediaObject = await client(UploadedMediaObject).fetchOne(uploadedMediaObjectID)

  await uploadDocumentChunks(mediaItemRid, path, textChunks)

  //await uploadIndexedDocument(mediaItemRid, path, folderID)

  console.timeEnd("indexing")

}

export {uploadIndexedDocument, uploadDocumentChunks, indexDocument}
