import { 
  $Objects, $Actions, $Queries, 
  EmbeddedTrialDataChunkV2,
  semanticSearchGeneratePrompt,
  uploadToMediaset
} from "@legal-document-analysis/sdk";
//import { Osdk, PageResult, Result  } from "@osdk/client";
//import { ObjectSet } from "@osdk/api";
import client from "./client";
import { OSDKMessage, Document } from "../types";

const debug = () => {
    return {
        objectNames: Object.keys($Objects),
        actionNames: Object.keys($Actions),
        queryNames: Object.keys($Queries)
    }
}


type askTrialDataRAGCB = (n: any[]) => any;
const askTrialDataRAG = async (question: string, history: OSDKMessage[] , callback: askTrialDataRAGCB) =>  {
  console.log('askTrialDataRAG');
  const result = await client(semanticSearchGeneratePrompt).executeFunction({
    "question": question,
    "history": history
  });
  callback(result);
};

const getAllDocuments = async () : Promise<Document>  =>  {
  const sortByPath = (a: Document, b: Document): number => {
    return a.name.localeCompare(b.name);
  };
  const result = await client(EmbeddedTrialDataChunkV2)
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

const uploadFile= async (path: string, value: string) : Promise<string>  => {
  const result = await client(uploadToMediaset).executeFunction({
    "path": path,
    "content": value
  });
  return result;
};

export {getAllDocuments, askTrialDataRAG, uploadFile, debug};
