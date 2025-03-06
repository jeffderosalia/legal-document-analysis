import React, {useEffect, useState } from 'react';
import { Tree } from 'primereact/tree';
import { Document } from '../types';
import "primereact/resources/themes/soho-light/theme.css";
 import  './DocumentTreePrime.css';

interface ModalProps {
  documents?: Document;
  setSelectedDocs: (docs: string[]) => void;
}
interface TreeNode {
  label: string;
  key: string;
  icon?: string;
  droppable?: boolean;
  children? : TreeNode[];
}

// Generic Modal Component
export const DocumentTreePrime: React.FC<ModalProps> = ({documents, setSelectedDocs}) => {
  const [nodes, setNodes] = useState<any>([]);
  const [selectedKeys, setSelectedKeys] = useState<any>([]);

  useEffect(() => {
    console.log('documents', documents)
    const convertDocumentsToTreeNodes = (documents: Document[]): TreeNode[] => {
      return documents.map((doc) => ({
        label: doc.name,
        key: doc.id,
        droppable: (doc.type === "file" ? false : true),
        icon: 'pi pi-fw pi-home',
        children: doc.children ? convertDocumentsToTreeNodes(doc.children) : undefined,
      }));
    };
    /*
    const root = {
      label: 'Select all...',
      key: '0',
      children: documents?.children ? convertDocumentsToTreeNodes(documents?.children) : undefined,
    }*/

    setNodes(documents?.children ? convertDocumentsToTreeNodes(documents?.children) : undefined);
  }, [documents]);

  /*
  const treedata = [
      { 
        key: '0', 
        label: 'All Documents',
        children: [
          { key: "0-0", label: "Unread" },
          { key: "0-1", label: "Threads" },
          {
            key: "0-2",
            label: "Chat Rooms",
            children: [
              { key: "0-2-0", label: "General" },
              { key: "0-2-1", label: "Random" },
              { key: "0-2-2", label: "Open Source Projects" },
            ],
          },
          {
            key: "0-3",
            label: "Direct Messages",
            children: [
              { key: "0-3-0", label: "Alice" },
              { key: "0-3-1", label: "Bob" },
              { key: "0-3-2", label: "Charlie" },
            ],
          },
    
        ]
      }
    ];
    useEffect(() => {
      setNodes(treedata);
  }, []);
  */

  return (
    <div id="fileTree">
        {nodes != null && (
          <Tree value={nodes} 
            selectionMode="checkbox"
            selectionKeys={selectedKeys} 
            onSelectionChange={(e) => setSelectedKeys(e.value)} 
            dragdropScope="demo" 
            onDragDrop={(e) => setNodes(e.value)} className="w-full md:w-30rem"
             />

       )}
 
    </div>
  );
};
