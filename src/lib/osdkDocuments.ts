import { 
  IndexedDocument,
  DocumentFolder,
  createDocumentFolder,
  deleteDocumentFolder,
  renameDocumentFolder,
  moveDocumentFolder,
  modifyIndexedDocumentFolder
} from "@legal-document-analysis/sdk";
import { Osdk  } from "@osdk/client";
import client from "./client";

const createFolder = async(name: string) => {
  const result = await client(createDocumentFolder).applyAction(
    {
      "name": name, 
      "parent_id": ''
    },
    {
      $returnEdits: true,
    }
  );


  if (result.type === "edits") {
      return  result.addedObjects[0];
  }
};
const deleteFolder = async(key: string) => {
  const result = await client(deleteDocumentFolder).applyAction(
    {
    "DocumentFolder": {
      $primaryKey: key,    
      $apiName: "DocumentFolder",
      $objectType: "DocumentFolder",
      $title: key     
    }
    },
    {
      $returnEdits: true,
    }
  );

  if (result.type === "edits") {
      return result.editedObjectTypes[0];
  }
};

const renameFolder = async(key: string, name: string) =>  {
  const result = await client(renameDocumentFolder).applyAction(
    {
    "document_folder": { 
      $primaryKey: key,    
      $apiName: "DocumentFolder",
      $objectType: "DocumentFolder",
      $title: key    
    }, 
      "name": name
    },
    {
    $returnEdits: true,
    }
  );

  if (result.type === "edits") {
      return result.editedObjectTypes[0];
  }
};

const moveFolder = async(key: string, parent: string) =>  {
  const result = await client(moveDocumentFolder).applyAction(
    {
    "document_folder": { 
      $primaryKey: key,    
      $apiName: "DocumentFolder",
      $objectType: "DocumentFolder",
      $title: key    
    }, 
      "parent_id": parent
    },
    {
    $returnEdits: true,
    }
  );

  if (result.type === "edits") {
      return result.editedObjectTypes[0];
  }
};

const moveFiles = async(folderName: string, files: Osdk.Instance<IndexedDocument>[]) => {
  const filesToMove = files.map(m=> ({
      "indexed_document": {
        $primaryKey: m.$primaryKey,    
        $apiName: m.$apiName,
        $objectType: m.$objectType,
        $title: m.$title      
      },
      "folder_id":folderName
    }));

  await client(modifyIndexedDocumentFolder).batchApplyAction(
    filesToMove,
    {
        $returnEdits: false,
    }
  );  
};

const getFiles = async() => {
  const objects: Osdk.Instance<IndexedDocument>[]= [];

  for await(const obj of client(IndexedDocument).asyncIter()) {
      objects.push(obj);
  }
  return objects;  
}
const getFolders = async() => {
  const objects: Osdk.Instance<DocumentFolder>[]= [];

  for await(const obj of client(DocumentFolder).asyncIter()) {
      objects.push(obj);
  }
  return objects;  
}

const getFilesAndFolders = async() =>  {
  return await Promise.all([
    getFiles(),
    getFolders()
  ]);
};

export {getFilesAndFolders, createFolder, deleteFolder, renameFolder, moveFolder, moveFiles};
