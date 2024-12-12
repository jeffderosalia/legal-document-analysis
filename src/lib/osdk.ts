import { 
  $Objects, $Actions, $Queries, 
  generateQuestionsFromFileContains, 
  SemanticExDocument, 
  semanticSearchTrialData, 
  semanticSearchDemoLogic 
} from "@legal-document-analysis/sdk";
import { Osdk, PageResult, Result  } from "@osdk/client";
import { QueryParam, ObjectSet } from "@osdk/api";
import client from "./client";

const debug = () => {
    return {
        objectNames: Object.keys($Objects),
        actionNames: Object.keys($Actions),
        queryNames: Object.keys($Queries)
    }
}

const getDocumentsListOld = async () : Promise<Osdk.Instance<SemanticExDocument>[]> => {
    
    console.log('getDocuments');
    const response:  Result<PageResult<Osdk.Instance<SemanticExDocument>>>
      = await client(SemanticExDocument).fetchPageWithErrors({ $pageSize: 30 });
    if (response.value?.data) {
      return response.value?.data.filter(Boolean);
    }
    return [];
};

//"20230918-APM-BT5-PM-PUBLIC-Google.pdf"
const generateQuestions = async (filename: string) => {
    console.log('generateQuestions');
    const result = await client(generateQuestionsFromFileContains).executeFunction({
      "filename_contains": filename 
    });
    console.log(result);
    return result;
};
type sendChatCB = (n: string) => any;

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

const askTrialData = async (question: string, subject: string, callback: sendChatCB) =>  {
  console.log('askTrialData');
  const result = await client(semanticSearchTrialData).executeFunction({
    "question": question,
    "subject": subject
  });
  callback(result);
};

export {getDocumentsList, generateQuestions, askTrialData, sendChat, debug};
