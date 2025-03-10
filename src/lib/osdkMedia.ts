import { __EXPERIMENTAL__NOT_SUPPORTED_YET__createMediaReference } from "@osdk/api/unstable";
import { MediaReference } from "@osdk/api";
import { 
  IndexedDocument
  //,  createUploadedMediaObject
} from "@legal-document-analysis/sdk";
import client from "./client";


// To upload media with 2.x, it has to be linked to an Action call
async function createMedia(file: File): Promise<MediaReference> {
  return await client(
      __EXPERIMENTAL__NOT_SUPPORTED_YET__createMediaReference,
  ).createMediaReference({
      data: file,
      fileName: file.name,      
      objectType: IndexedDocument,
      propertyType: "mediaReference",
  });
}

async function uploadMedia(file: File) {
  const mediaReference = await createMedia(file);
  console.log("Updated object", //updatedObject, 
    "mediaItemRid", mediaReference.reference.mediaSetViewItem.mediaItemRid, 
    "mediaSetRid", mediaReference.reference.mediaSetViewItem.mediaSetRid,
    "mediaSetViewRid", mediaReference.reference.mediaSetViewItem.mediaSetViewRid,
  );

  /*
  The interface changed again.  See api documentation to fix this.
  const result = await client(createUploadedMediaObject).applyAction(
      {
      "media_reference": mediaReference
      },
      {
      $returnEdits: true,
      }
  );
  
  if (result.type === "edits") {
      // for new objects and updated objects edits will contain the primary key of the object
      const updatedObject = result.editedObjectTypes[0];
      console.log("Updated object", updatedObject, 
        "mediaItemRid", mediaReference.reference.mediaSetViewItem.mediaItemRid, 
        "mediaSetRid", mediaReference.reference.mediaSetViewItem.mediaSetRid,
        "mediaSetViewRid", mediaReference.reference.mediaSetViewItem.mediaSetViewRid,
      );
  }
  */
}


export {uploadMedia};
