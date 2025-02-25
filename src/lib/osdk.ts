import { 
  $Objects, $Actions, $Queries, 
  //EmbeddedTrialDataChunkV2,
  UploadedMediaChunk,
  semanticSearchGeneratePrompt,
  constructPromptMaybeWithSelectedDocuments
} from "@legal-document-analysis/sdk";
//import { Osdk, PageResult, Result  } from "@osdk/client";
//import { AttachmentUpload } from "@osdk/api";
import client from "./client";
import {auth, platformClient} from "./client";
import { OSDKMessage, Document } from "../types";
import { getCurrent } from "@osdk/foundry.admin/User";


const getUser = async () => {
  return await getCurrent(platformClient);;
}

const debug = () => {
    return {
        objectNames: Object.keys($Objects),
        actionNames: Object.keys($Actions),
        queryNames: Object.keys($Queries)
    }
}


type askTrialDataRAGCB = (n: any[], d: any[], historyString: string) => any;
const askTrialDataRAG = async (question: string, history: OSDKMessage[] , callback: askTrialDataRAGCB) =>  {
  const result = await client(semanticSearchGeneratePrompt).executeFunction({
    "question": question,
    "history": history,
  });
  callback(result, [], "");
};

const estimateMaxDocuments = async (question: string, historyString: string, maxTokens: number) => {

  const bufferSpace = 5000
  const tokensPerDoc = 650 // pure guesswork

  const questionAndHistory = Math.floor((question.length + historyString.length) / 4)
  const fillTokens = maxTokens - questionAndHistory - bufferSpace

  console.log(`~${fillTokens} tokens available in input context`)

  return Math.floor(fillTokens / tokensPerDoc)

}

const createPrompt = async (question: string, mediaItems: string[], historyString: string, maxTokens: number, callback: askTrialDataRAGCB) => {

  const k = await estimateMaxDocuments(question, historyString, maxTokens)

  console.log(`Retrieving ${k} chunks`)

  const result = await client(constructPromptMaybeWithSelectedDocuments).executeFunction({
    "question": question,
    "history_string": historyString,
    "media_items": mediaItems,
    "k": k // Max number of document chunks to retrieve
  });
  callback(result, mediaItems, historyString);
};

const getAllDocuments = async () : Promise<Document>  =>  {
  const sortByPath = (a: Document, b: Document): number => {
    return a.name.localeCompare(b.name);
  };
  const result = await client(UploadedMediaChunk)
      .aggregate({
          $select: {  $count: "unordered"  },
          $groupBy: { mediaItemRid : "exact", "path": "exact" }
      });
  const items: Document[] = result.map(item => ({
    id: item.$group.mediaItemRid || '',
    name: item.$group.path || '' ,
    type: 'file',
  }));
  const sortedItems: Document[] = items.sort(sortByPath);

  const transformedArray: Document = {
    id: 'root',
    name: 'Document Collections',
    type: 'folder',
    children: sortedItems
  };
  return transformedArray;  
};

const uploadFile= async (name: string, contents: string) => {
  const HOSTNAME = 'stewardshipped-jsd.usw-3.palantirfoundry.com'
  const TOKEN = auth.getTokenOrUndefined();
  //const uploadUrl = `https://${HOSTNAME}/api/v2/ontologies/attachments/upload?filename=${encodeURIComponent(name)}`;
  const mediaSetRid = 'ri.mio.main.media-set.0b79e674-2e1a-406f-a163-bb949f91cee3'
  const uploadUrl = `https://${HOSTNAME}/api/v2/mediasets/${mediaSetRid}/items?mediaItemPath=${encodeURIComponent(name)}&preview=true`;

  // const reader = new FileReader();
  // reader.onload = () => {
  //ri.mio.main.media-set.0b79e674-2e1a-406f-a163-bb949f91cee3
    fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'Authorization': `Bearer ${TOKEN}`,
        },
        body: contents 
    }).then((response) => {
      return response.json();
    }).then(async (data) => {

      console.log(data)
      /*
      const result = await client(uploadToMediaset).executeFunction({
        "path": data.filename,
        "attachment_rid": data.rid
      });*/
      const body = {
        "path": data.filename,
        "attachment_rid": data.rid
      };
      
      fetch(`https://${HOSTNAME}/api/v2/ontologies/ontology-1f5d6c7f-5c23-4afc-9c62-285ebdba6e8e/objectTypes/UploadedMediaObject/media/mediaItem/upload?mediaItemPath=${encodeURIComponent(name)}&preview=true`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/octet-stream',
              'Authorization': `Bearer ${TOKEN}`,
          },
          body: JSON.stringify(body) 
      }).then((response) => {
        return response.json();
      }).then(async (data) => {
        console.log(data)
        
      });
      
    });
};

export {getAllDocuments, createPrompt, askTrialDataRAG, uploadFile, getUser, estimateMaxDocuments, debug};
