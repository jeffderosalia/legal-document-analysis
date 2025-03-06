import React, {useEffect, useState } from 'react';
import { Tree, NodeRendererProps } from 'react-arborist';
import { Document } from '../types';
// import  './DocumentTreeView.css';

interface ModalProps {
}
interface TreeNodeData {
  name: string;
  id: string;
  children?: TreeNodeData[];
}

const Node = ({ node, style, dragHandle }: NodeRendererProps<TreeNodeData>) => {
  return (
    <div style={style} ref={dragHandle}>
      {node.isLeaf ? "X" : "🗀"} {node.data.name}
    </div>
  );
};

// Generic Modal Component
export const DocumentTreeArborist: React.FC<ModalProps> = () => {
    const [user, setUser] = useState<any>();
    const treedata: TreeNodeData[] = [
      { id: "1", name: "Unread" },
      { id: "2", name: "Threads" },
      {
        id: "3",
        name: "Chat Rooms",
        children: [
          { id: "c1", name: "General" },
          { id: "c2", name: "Random" },
          { id: "c3", name: "Open Source Projects" },
        ],
      },
      {
        id: "4",
        name: "Direct Messages",
        children: [
          { id: "d1", name: "Alice" },
          { id: "d2", name: "Bob" },
          { id: "d3", name: "Charlie" },
        ],
      },
    ];
/*
  useEffect(() => {
    const convertDocumentsToTreeNodes = (documents: Document[]): TreeNode[] => {
      return documents.map((doc) => ({
        label: doc.name,
        value: doc.id,
        checked: false,
        expanded: false,
        children: doc.children ? convertDocumentsToTreeNodes(doc.children) : undefined,
      }));
    };
    const root = {
      label: 'Select all...',
      value: 'root',
      checked: false,
      expanded: true,
      children: documents?.children ? convertDocumentsToTreeNodes(documents?.children) : undefined,
    }
    setTreedata(root);
    console.log('Set Tree Data')
  }, [documents]);*/

  const onCreate = ({ parentId, index, type }) => {};
  const onRename = ({ id, name }) => {};
  const onMove = ({ dragIds, parentId, index }) => {};
  const onDelete = ({ ids }) => {};
  return (
    <div>
        {treedata != null && (
          <Tree initialData={treedata}
            onToggle={(id) => console.log(id)}
            >
            {Node}
            </Tree>
        )}
 
    </div>
  );
};
