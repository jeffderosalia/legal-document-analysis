import React, { useState } from 'react';
import "./DocumentChat.css";
import { ChevronRight, File, Folder, Send } from 'lucide-react';
import { Document, Message } from './types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {askTrialDataRAG} from './lib/osdk'
// import { Osdk } from "@osdk/client";
// import { SemanticExDocument } from "@legal-document-analysis/sdk";
// import { ObjectSet } from "@osdk/api";
//import {processDocument} from './lib/openai.ts'
import {chat} from './lib/llmclient';

const DocumentChat: React.FC = () => {
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['projects', 'marketing']);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
//  const [rawdocuments, setRawdocuments] = useState<ObjectSet<SemanticExDocument>>();
//  const [documents, setDocuments] = useState<Document>();

  const provider = 'openai';
  const model = 'gpt-4o-mini';
  const apiKey = process.env.VITE_OPENAI_API_KEY || 'iamnotgonnawork';

  /*
  useEffect(() => {
    const fetchDocuments = async () => {
      const docList: ObjectSet<SemanticExDocument> = await getDocumentsList();
      setRawdocuments(docList);

      const objects: Osdk.Instance<SemanticExDocument>[] = [];;
      for await(const obj of docList.asyncIter()) {
          objects.push(obj);
      }

      const documents: Document = {
        id: 'root',
        name: 'Documents',
        type: 'folder',
        children: objects.map((doc): Document => ({
          id: doc.mediaItemRid  ?? '',
          name: doc.path ?? '',
          type: 'file'
        }))
      };
      setDocuments(documents);
    };
    fetchDocuments();
  }, []);*/

  const documents: Document = {
    id: 'root',
    name: 'Document Collections',
    type: 'folder',
    children: [
    //   {
    //     id: 'projects',
    //     name: 'Projects',
    //     type: 'folder',
    //     children: [
    //       { id: 'proj1', name: 'Q1 Planning', type: 'file' },
    //       { id: 'proj2', name: 'Team Structure', type: 'file' },
    //     ]
    //   },
      { id: 'notes1', name: 'Taylor Transcripts', type: 'file' },
      { id: 'notes2', name: 'Roach Transcripts', type: 'file' },
      { id: 'notes3', name: 'Bagnell Transcripts', type: 'file' },
      { id: 'notes4', name: 'Ferraiuolo Transcripts', type: 'file' },
      { id: 'notes5', name: 'Santana Transcripts', type: 'file' },
    ]
  };

  const toggleFolder = (folderId: string): void => {
    setExpandedFolders(prev => 
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const toggleDocument = (docId: string): void => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };
  const sendChatCB = async (messages: any[]) => {
    console.log('sendChatCB')
    console.log(messages);
    const allMessages = [
      {"role": "system", "content": "Create all tables using markdown"},
      ...messages,
    ]

    let fullResponse = '';
    await chat(
      provider,
      model,
      allMessages,
      apiKey,
      {
        streaming: true,
        onToken: (token) => {
          fullResponse += token;
        }
      }
    );
    fullResponse = fullResponse.replace(/```(?:\w+)?\n([\s\S]*?)```/g, '$1').trim();
    console.log(fullResponse);

    setMessages(prev => [...prev, 
      { type: 'assistant', content: fullResponse }
    ]);
  };

  const handleSendMessage = (): void => {
    if (!inputValue.trim()) return;
  
    //const docs = rawdocuments?.where() (doc => selectedDocs.includes(doc.mediaItemRid));
    // const objectSet = rawdocuments?.where({
    //   mediaItemRid: { $in: selectedDocs }
    // });
    //if (objectSet != null) {
    askTrialDataRAG(inputValue.trim(), messages, sendChatCB);
    //}
    setMessages(prev => [...prev, 
      { type: 'user', content: inputValue }
    ]);
    setInputValue('');
  };

  const renderItem = (item: Document, depth: number = 0): React.ReactNode => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.includes(item.id);
    const isSelected = selectedDocs.includes(item.id);

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
                onChange={() => toggleDocument(item.id)}
              />
            </div>
          )}
          
          {isFolder ? (
            <Folder className="icon" />
          ) : (
            <File className="icon" />
          )}
          
          <span className="item-name">{item.name}</span>
        </div>

        {isFolder && isExpanded && item.children && (
          <div className="children">
            {item.children.map(child => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">Documents</div>
        {documents && documents.children?.map(item => renderItem(item))}
      </div>

      <div className="main-content">
        <div className="header">
          <h2>Selected Collections: {selectedDocs.length}</h2>
        </div>

        <div className="messages-container">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message-wrapper ${message.type}`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} className="message">{message.content}</ReactMarkdown>
              {/* <div className="message">
                {message.content}
              </div> */}
            </div>
          ))}
        </div>

        <div className="chat-input">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question about your documents..."
          className="chat-input"
          rows={3}  // Adjust this number for desired default height
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button onClick={handleSendMessage}>
            <Send />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentChat;