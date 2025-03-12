import React, {useEffect, useState } from 'react';
import { Tree } from 'primereact/tree';
import "primereact/resources/themes/soho-light/theme.css";
import  './DocumentTreePrime.css';
import { DocumentFolder, IndexedDocument } from '@legal-document-analysis/sdk';
import {getFilesAndFolders, createFolder, deleteFolder, renameFolder, moveFolder, moveFiles} from '../lib/osdkDocuments'
import { Osdk  } from "@osdk/client";
import { Folder, FolderPlus, Save } from 'lucide-react';

interface ModalProps {
  setSelectedDocs: (docs: string[]) => void;
}
interface TreeNode {
  label: string;
  newLabel?: string;
  key: string;
  isFolder: boolean;
  droppable?: boolean;
  editMode?: boolean;
  isNew?: boolean;
  children? : TreeNode[];
}
// Generic Modal Component
export const DocumentTreePrime: React.FC<ModalProps> = ({setSelectedDocs}) => {
  const [files, setFiles] = useState<Osdk.Instance<IndexedDocument>[]>();
  const [nodes, setNodes] = useState<any[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<any>([]);
 
  const nodeTemplate = (node: any, options: any) => {
    if (node.isFolder) {
      if (node.editMode) {
        return (
          <div className="folder">
            <Folder fill="#e7c9a9" stroke="#f1d592"/>&nbsp;
            <input className="edit-folder" name={node.key} type="text" value={node.newLabel} onChange={(e) => handleInputChange(node.key, e.target.value)} />
            
            <a href="#" className='close' onClick={() => handleSaveRename(node.key, node.newLabel, node.isNew || false)}><Save stroke="#666" /></a>
          </div>);
        }
      return (
        <div className="folder">
          <Folder fill="#e7c9a9" stroke="#f1d592"/>&nbsp;
          <span className={options.className}>{node.label}</span>
          {node.children.length === 0 && (
          <a href="#" className='close' onClick={() => handleDeleteFolder(node.key)}>X</a>
          )}
        </div>);
    }
  
    return <span className={options.className}>{node.label}</span>;
  }
  
  useEffect(() => {
    const fetchDocs = async () =>  {
      console.log('fetching...')
      let [newFiles, newFolders] = await getFilesAndFolders();
      //newFiles = newFiles.filter(m=> m.path?.includes('Taylor') && m.folderId == null);
      //const disc = newFiles.filter(m=> m.path?.includes('Disc') && m.path?.includes('Taylor'));
      //const tayDiscovery = "38717c8b-794b-4ba4-ae00-9723fcb61ed6";
      //await moveFiles(tayDiscovery, disc)

      setFiles(newFiles);
      console.log('gotten...')
      const fullTree = buildTree(newFolders, newFiles);
      console.log('fullTree',fullTree)
      setNodes(fullTree);
    };
    fetchDocs();
  }, []);
  useEffect(() => {
    //console.log(selectedKeys);    
    const files = Object.keys(selectedKeys).filter(m=> m.startsWith('ri.mio'));
    setSelectedDocs(files);

  }, [selectedKeys]);

  const handleAddFolder = () => {
    const newNodes = [
      { label: 'New Folder', key: Math.round(Math.random() * 100000000).toString(), editMode: true, isNew: true, droppable: true, isFolder: true, children: [] as TreeNode[] },
      ...nodes
    ];
    setNodes(newNodes)
  };
  const handleDeleteFolder = async (nodeKey: string) => {
    await deleteFolder(nodeKey);
    setNodes((prevNodes) => prevNodes
      .map((node) => removeNode(node, nodeKey))
      .filter(Boolean) as TreeNode[]
    );
      console.log('deleting', nodeKey);
  };
  const handleSaveRename = async (nodeKey: string, value: string, isNew: boolean) => {
    let newProps: Partial<TreeNode> = {
      label: value,
      editMode: false,
      isNew: false
    };
   if (isNew) {
      const newFolder = await createFolder(value);    
      newProps.key = newFolder?.primaryKey.toString();
    } else {
      await renameFolder(nodeKey, value)
    }
    setNodes((prevNodes) =>
      prevNodes.map((node) => updateNode(node, nodeKey, newProps))
    );
  };

  const handleInputChange = (nodeKey: string, value: string) => {
    const newProps = {"newLabel": value};
    setNodes((prevNodes) =>
      prevNodes.map((node) => updateNode(node, nodeKey, newProps))
    );
  };
  
  const removeNode = (node: TreeNode, nodeKey: string) => {
    if (node.key === nodeKey) {
      return null; // Remove the node by returning null
    }
    if (node.children) {
      const updatedChildren = node.children
        .map((child) => removeNode(child, nodeKey))
        .filter(Boolean) as TreeNode[]; // Remove null values
  
      return { ...node, children: updatedChildren };
    }
    return node;
  };
  const updateNode = (node: TreeNode, nodeKey: string, newProps: object): TreeNode => {
    if (node.key === nodeKey) {
      return { ...node, ...newProps };
    }
    if (node.children) {
      return { ...node, children: node.children.map((child) => updateNode(child, nodeKey, newProps)) };
    }
    return node;
  };
  const handleDragDrop = async (e: any) => {
    console.log(e);
    if (e.dragNode.isFolder) {
      console.log(e.dragNode.key, e.dropNode.key)
      await moveFolder(e.dragNode.key, e.dropNode.key)

    } else {
      //await moveFiles()
      const file = files?.find(m=> m.$primaryKey == e.dragNode.key)
      if (file != null) {
        await moveFiles(e.dropNode.key, [file])
      }
    }


    setNodes(e.value)
  };
  const buildTree = (folders: Osdk.Instance<DocumentFolder>[], files: Osdk.Instance<IndexedDocument>[]): TreeNode[] => {
    console.log('bt input', folders, files)
    const folderMap = new Map<string, TreeNode>();

    folderMap.set ('root', { label: '(Unsorted)', key: 'root', droppable: true, isFolder: true, children: [] as TreeNode[] })
    folders.forEach(f => {
      folderMap.set(f.id, { label: f.name || 'No Name', key: f.$primaryKey, droppable: true, isFolder: true, children: [] as TreeNode[] });
    });
    // Attach folders to their parent folders
    folders.forEach(f => {
      if (f.parentId != '') {
        const parentNode = folderMap.get(f.parentId || 'root');
        const folderNode = folderMap.get(f.id);
        if (parentNode && folderNode) {
          if (parentNode.children === undefined) parentNode.children = [];
          parentNode.children.push(folderNode);
        }
      }
    });
    // Attach files to their respective folders
    files.forEach(file => {
      const fileNode: TreeNode = { label: file.path || 'No Name', key: file.$primaryKey, droppable: false, isFolder: false  };
      folderMap.get(file.folderId || 'root')?.children?.push(fileNode);
    });

    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.label.localeCompare(b.label));
      nodes.forEach(n => n.children && sortNodes(n.children));
    };
  
    // Extract root-level folders and sort
    const rootNodes = folders
      .filter(f => !folderMap.has(f.parentId || ''))
      .map(f => folderMap.get(f.id)!);
  
    sortNodes(rootNodes);
  
    const rootFolder = folderMap.get('root');
    return rootFolder ? [...rootNodes, rootFolder] : rootNodes;
  };
  
  return (
    <div id="fileTree">
        <a id="addFolder" onClick={handleAddFolder}><FolderPlus stroke='#666'  /></a>        
        {nodes != null && (
          <Tree value={nodes} 
            filter 
            filterMode="strict" 
            filterPlaceholder="Filter"
            nodeTemplate={nodeTemplate}
            selectionMode="checkbox"
            selectionKeys={selectedKeys} 
            onSelectionChange={(e) => {console.log(e); setSelectedKeys(e.value)}} 
            dragdropScope="demo" 
            onDragDrop={handleDragDrop} 
             />
       )}
 
    </div>
  );
};
