import React, {useEffect, useState, useMemo} from 'react';
import DropdownTreeSelect, {NodeAction, TreeNode, TreeData} from 'react-dropdown-tree-select'
import 'react-dropdown-tree-select/dist/styles.css'
import { Document } from '../types';
import  './DocumentTreeView.css';

interface ModalProps {
  documents?: Document;
//  setSelectedDocs: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedDocs: (docs: string[]) => void;
}

// Generic Modal Component
const DocumentTreeViewRaw: React.FC<ModalProps> = ({ documents, setSelectedDocs}) => {
    const [user, setUser] = useState<any>();
  
  console.log('Draw tree')
  const treedata = useMemo(() => {
    if (!documents) return undefined;
    
    const convertDocumentsToTreeNodes = (docs: Document[]): TreeNode[] => {
      return docs.map((doc) => ({
        label: doc.name,
        value: doc.id,
        checked: false,
        expanded: false,
        children: doc.children ? convertDocumentsToTreeNodes(doc.children) : undefined,
      }));
    };
  
    return {
      label: 'Select all...',
      value: 'root',
      checked: false,
      expanded: true,
      children: documents.children ? convertDocumentsToTreeNodes(documents.children) : undefined,
    };
  }, [documents]);
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

  const onChange = (currentNode: TreeNode, selectedNodes: TreeNode[]) => {
    const newNodes = [...selectedNodes].map(m=> m._id);
    const q = currentNode.label;
    //setSelectedDocs(newNodes);
    setUser(q);
    console.log('onChange::', currentNode, selectedNodes)
  }
  const onAction = (node: TreeNode, action: NodeAction) => {
    console.log('onAction::', action, node)
  }
  const onNodeToggle = (currentNode: TreeNode) => {
    console.log('onNodeToggle::', currentNode)
  }
  return (
    <div>
        {treedata != null && (
         <DropdownTreeSelect data={treedata} 
            onChange={onChange} 
            onAction={onAction} 
            onNodeToggle={onNodeToggle}
            showDropdown='always'
            texts={{ placeholder: 'Search' }}
             />
        )}
 
    </div>
  );
};

export const DocumentTreeView = React.memo(DocumentTreeViewRaw);