import React, {useEffect, useState } from 'react';
import { UncontrolledTreeEnvironment, Tree, StaticTreeDataProvider } from 'react-complex-tree';
import { Document } from '../types';
// import  './DocumentTreeView.css';

interface ModalProps {
}

// Generic Modal Component
export const DocumentTreeComplex: React.FC<ModalProps> = () => {
    const [user, setUser] = useState<any>();
    const treedata = {
      root: {
        index: 'root',
        isFolder: true,
        children: ['folder1', 'folder2'],
        data: 'Root item',
      },
      child1: {
        index: 'child1',
        children: [],
        data: 'Child item 1',
      },
      folder1: {
        index: 'folder1',
        isFolder: true,
        children: ['child1','child2'],
        data: 'Folder 1',
      },
      child2: {
        index: 'child2',
        children: [],
        data: 'Child item 2',
      },
      folder2:{
        index: 'folder2',
        isFolder: true,
        children: [],
        data: 'Folder 2',
      },
    };
    const dataProvider = new StaticTreeDataProvider(treedata, (item, newName) => ({ ...item, data: newName }));
    const listener = (changedItemIds: (string | number)[]) => {
      const changedItems = changedItemIds.map(dataProvider.getTreeItem)
      console.log("Changed items:", changedItems)
    }
    dataProvider.onDidChangeTreeData(listener)
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
  return (
    <div>
        {treedata != null && (
          <UncontrolledTreeEnvironment
            dataProvider={dataProvider}
            getItemTitle={item => item.data}
            viewState={{}}
            canDragAndDrop={true}
            canDropOnFolder={true}
            canReorderItems={true}
          >
            <Tree treeId="tree-2" rootItem="root" treeLabel="Tree Example" />
          </UncontrolledTreeEnvironment>
       )}
 
    </div>
  );
};
