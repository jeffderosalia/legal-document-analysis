import { 
  createFileCollection,
  deleteFileCollection,
  FileCollection
} from "@legal-document-analysis/sdk";
import { Osdk  } from "@osdk/client";
import client from "./client";
//import { Params } from "react-router-dom";

type tCreateFileCollection = {
  collection_name: string;
  file_rid: string;
}
const createCollection = async(files: tCreateFileCollection[]) => {
  await client(createFileCollection).batchApplyAction(files,
    {
        $returnEdits: false,
    }
  );  
};

const getFileCollection = async () : Promise<Osdk.Instance<FileCollection>[]>  =>  {
  const objects: Osdk.Instance<FileCollection>[]= [];

  for await(const obj of client(FileCollection).asyncIter()) {
      objects.push(obj);
  }
  return objects;
};

const deleteCollection = async (files: Osdk.Instance<FileCollection>[]) => {
  const actions = files.map(m=> ({
    "FileCollection": { 
      $primaryKey: m.collectionId,    
      $apiName: m.$apiName,
      $objectType: m.$objectType,
      $title: m.$title
    }
  }));
  await client(deleteFileCollection).batchApplyAction(actions,
    {
        $returnEdits: false,
    }
  );
};

export {createCollection, getFileCollection, deleteCollection};
