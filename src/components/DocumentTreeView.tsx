import React, {useEffect, useState} from 'react';
import DropdownTreeSelect, {NodeAction, TreeNode, TreeData} from 'react-dropdown-tree-select'
import 'react-dropdown-tree-select/dist/styles.css'
import { Document } from '../types';
import  './DocumentTreeView.css';

interface ModalProps {
  documents?: Document;
  setSelectedDocs: React.Dispatch<React.SetStateAction<string[]>>;
}

// Generic Modal Component
export const DocumentTreeView: React.FC<ModalProps> = ({ documents, setSelectedDocs}) => {
  const [treedata, setTreedata] = useState<TreeData>();
  const [selected, setSelectedDocs2] = useState<string[]>([]);
  

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
  }, [documents]);

  const onChange = (currentNode: TreeNode, selectedNodes: TreeNode[]) => {
    setSelectedDocs(selectedNodes.map(m=> m.value));
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
            inlineSearchInput={false}
             />
        )}
 
    </div>
  );
};