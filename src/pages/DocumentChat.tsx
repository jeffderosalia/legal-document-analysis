import React, { useState, useEffect, useCallback } from 'react';
import "./DocumentChat.css";
import { ChevronRight, File, Folder } from 'lucide-react';
import { ChatDisplay } from '../components/ChatDisplay';
import { ChatInput } from '../components/ChatInput';
import {CreateCollectionModal} from '../components/CreateCollectionModal'
import { askTrialDataRAG, getAllDocuments } from '../lib/osdk';
import { createCollection, getFileCollection, deleteCollection } from '../lib/osdkCollections';
import { chat } from '../lib/llmclient';
import { Document, Message, Provider, MessageGroup, OSDKMessage } from '../types';
import { Osdk  } from "@osdk/client";
import { FileCollection } from "@legal-document-analysis/sdk";
import Header from '../components/Header'

type UIProvider = {
  id: 'chatgpt' | 'anthropic';
  provider: Provider;
  model: string;
  name: string;
  enabled: boolean;
  apiKey: string;
}

const DocumentChat: React.FC = () => {
  const [collections, setCollections] = useState<Osdk.Instance<FileCollection>[]>([]);
  const [documents, setDocuments] = useState<Document>();
  const [selectedDocs, setSelectedDocs] = useState<Document[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['projects', 'marketing']);
  const [loadingLLM, setLoadingLLM] = useState<Boolean>(false);
  const [messages, setMessages] = useState<MessageGroup[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [providers, setProviders] = useState<UIProvider[]>([
    { id: 'chatgpt', provider: 'openai', model: 'gpt-4o-mini', name: 'ChatGPT', enabled: true, apiKey: process.env.VITE_OPENAI_API_KEY || "x" },
    { id: 'anthropic', provider: 'anthropic', model: 'claude-3-5-sonnet-20241022',name: 'Anthropic', enabled: false, apiKey: process.env.VITE_ANTHROPIC_API_KEY || "x" }
  ]);
  useEffect(() => {
    console.log('in effect')
    if (messages.length > 0 && loadingLLM) {
      const history: OSDKMessage[] = messages.flatMap((group) => [
        {
          type: group.question.role,
          content: group.question.content
        },
        ...(group.answers[0] ? [{
          type: group.answers[0].role,
          content: group.answers[0].content
        }] : [])
      ]);  
      askTrialDataRAG(messages[messages.length - 1].question.content, history, sendChatCB);
    }
  }, [messages, loadingLLM]);
  const fetchDocuments = async () => {
    const [colls, docs] = await Promise.all(
      [getFileCollection(),getAllDocuments()]
    );
    setCollections(colls);
    const collIds = colls.reduce((acc, obj) => {
      if (!acc[obj.collectionName||'']) {
        acc[obj.collectionName||''] = [];
      }
      acc[obj.collectionName||''].push(obj.fileRid||'');
      return acc;
    }, {} as Record<string, string[]>);
    
    const distinctCollections = [...new Set(colls.map(obj => obj.collectionName))]
      .map(coll => ({
        id: coll,
        name: coll,
        type: 'folder'
      } as Document));
    distinctCollections.forEach(coll=> {
      const matching = docs.children?.filter(m=> collIds[coll.name].includes(m.id))
        docs.children = docs.children?.filter(m=> !collIds[coll.name].includes(m.id))
      coll.children = matching;
    });
    if (distinctCollections.length>0) {
      docs.children = [
        ...distinctCollections,
        ...docs.children || []
      ];
    }

    setDocuments(docs);
  };
  useEffect(() => {
      fetchDocuments();
  }, []);

  /*
  useEffect(() => {
    const fetch = async () => {
      const coll = await getFileCollection();
      coll.forEach(m=> {
        console.log('')

      } )
    }
    fetch();
  })*/
  const handleRemoveFromCollection = async (rid: string, coll: Document) => {
    const itemToRemove = collections.filter(m=> m.collectionName === coll.name && m.fileRid === rid)
    if (itemToRemove != null) {
      //console.log(itemToRemove);
      await deleteCollection(itemToRemove)
      await fetchDocuments();
    }
    else {
      console.log('no file to delete')
    }

  };

  const toggleFolder = (folderId: string): void => {
    setExpandedFolders(prev => 
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const toggleDocument = (doc: Document): void => {
    console.log(selectedDocs);
    setSelectedDocs(prev =>
      prev.find(m=> m.id == doc.id) === undefined
        ? [...prev, doc]
        : prev.filter(docx => docx.id !== doc.id)
    );
  };

  const sendChatCB = useCallback(async (question: Message[]) => {
    console.log("sendChatCB messages at start:", messages);
    setLoadingLLM(false);
    const enabledProviders = providers.filter(p => p.enabled);
    const allMessages = [...question];
    allMessages[0].content += "\nCreate all tables using markdown";
    console.log("allMessages");
    console.log(allMessages);
  
    await Promise.all(enabledProviders.map(async (p, index) => {
      let fullResponse = '';
  
      await chat(p.provider, p.model, allMessages, p.apiKey, {
        streaming: true,
        onToken: (token) => {
          fullResponse += token;
          console.log("chat messages")
          console.log(messages)
          const newMessages = [...messages];
          newMessages[newMessages.length-1].answers[index].content = fullResponse;
          setMessages(newMessages);
        }
      });
    }));
  }, [providers, messages]);;

  const handleCreateCollection =  (collectioninfo: any) => {
    console.log(collectioninfo);
    const create = async () => {
      const collection = collectioninfo.documents.map((m: Document)=> ({
        collection_name: collectioninfo.name,
        file_rid: m.id
      }))
      await createCollection(collection);
      setSelectedDocs([]);
      await fetchDocuments();
    };
    create();
  };

  const handleSendMessage = (message: string): void => {
    setQuestionCount(prev => prev + 1);
    const answers: Message[] = providers.filter(m=> m.enabled).map(m => ({role: 'assistant', content: '', provider: m.name}))
    const newMsg: MessageGroup = { started: false, groupId: `${questionCount}`,  question: {role: 'user', content: message }, answers: answers};
    console.log("setMessages")
    setMessages(prevMessages => [...prevMessages, newMsg]);
    setLoadingLLM(true);
    //askTrialDataRAG(message, history, sendChatCB);
  };

  const renderItem = (item: Document, depth: number = 0, parent: Document | null = null): React.ReactNode => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.includes(item.id);
    const isSelected = selectedDocs.find(m => m.id === item.id) !== undefined;

    return (
      <div key={item.id}>
        <div 
          className={`tree-item ${isFolder ? 'folder' : 'file'} ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 20}px` }}
        >
          {isFolder ? (
            <ChevronRight
              className={`chevron ${isExpanded ? 'expanded' : ''}`}
              onClick={() => toggleFolder(item.id)}
            />
          ) : (
            <div className="checkbox-wrapper">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleDocument(item)}
              />
            </div>
          )}
          
          {isFolder ? <Folder className="icon" /> : <File className="icon" />}
          <span className="item-name">{item.name}</span>
          {!isFolder && parent != null &&  (
            <a className="x" onClick={() => handleRemoveFromCollection(item.id, parent)}>X</a>
          )}
        </div>

        {isFolder && isExpanded && item.children && (
          <div className="children">
            {item.children.map(child => renderItem(child, depth + 1, item))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      <div className="sidebar">        
        <div className="sidebar-header">
          <button onClick={() => setIsModalOpen(true)}>Create Collection</button>
        </div>
        <CreateCollectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          documents={selectedDocs}
          onCreateCollection={handleCreateCollection}
        />
        <section className="collections-container">
        {documents && documents.children?.map(item => renderItem(item))}
        </section>
        <div className="provider-options">
          <h5>Select your Providers</h5>
          {providers.map(provider => (
            <label key={provider.id}>
              <input 
                type="checkbox"
                checked={provider.enabled}
                onChange={() => setProviders(prev => 
                  prev.map(p => p.id === provider.id ? {...p, enabled: !p.enabled} : p)
                )}
              />
              {provider.name}
            </label>
          ))}
          </div>
      </div>

      <div className="main-content">
        <Header />
        <ChatDisplay messages={messages} />
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};

export default DocumentChat;