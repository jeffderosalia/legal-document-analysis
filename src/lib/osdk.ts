import { 
  $Objects, $Actions, $Queries, 
  generateQuestionsFromFileContains, 
  SemanticExDocument, 
  EmbeddedTrialDataChunkV2,
  semanticSearchTrialData, 
  semanticSearchDemoLogic,
  semanticSearchGeneratePrompt
} from "@legal-document-analysis/sdk";
//import { Osdk, PageResult, Result  } from "@osdk/client";
import { ObjectSet } from "@osdk/api";
import client from "./client";
import { OSDKMessage, Document } from "../types";

const debug = () => {
    return {
        objectNames: Object.keys($Objects),
        actionNames: Object.keys($Actions),
        queryNames: Object.keys($Queries)
    }
}

/*
const getDocumentsListOld = async () : Promise<Osdk.Instance<SemanticExDocument>[]> => {
    
    console.log('getDocuments');
    const response:  Result<PageResult<Osdk.Instance<SemanticExDocument>>>
      = await client(SemanticExDocument).fetchPageWithErrors({ $pageSize: 30 });
    if (response.value?.data) {
      return response.value?.data.filter(Boolean);
    }
    return [];
};*/

//"20230918-APM-BT5-PM-PUBLIC-Google.pdf"
const generateQuestions = async (filename: string) => {
    console.log('generateQuestions');
    const result = await client(generateQuestionsFromFileContains).executeFunction({
      "filename_contains": filename 
    });
    console.log(result);
    return result;
};

//"20230918-APM-BT5-PM-PUBLIC-Google.pdf"
const sendChat = async (question: string, documents: ObjectSet<SemanticExDocument>, callback: sendChatCB) => {
    console.log('sendChat');
    console.log(question);
    console.log(documents);
    
    const result = await client(semanticSearchDemoLogic).executeFunction({
        "question": question,
        "documents": documents
    });

    console.log(result);
    callback(result);
};
const getDocumentsList = async () : Promise<ObjectSet<SemanticExDocument>> => {
    
  console.log('getDocuments');
  return await client(SemanticExDocument);
};

type sendChatCB = (n: string) => any;
const askTrialData = async (question: string, subject: string, history: any[] , callback: sendChatCB) =>  {
  console.log('askTrialData');
  const result = await client(semanticSearchTrialData).executeFunction({
    "question": question,
    "subject": subject,
    "history": history
  });
  callback(result);
};

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


export {getAllDocuments, getDocumentsList, askTrialDataRAG, generateQuestions, askTrialData, sendChat, debug};
