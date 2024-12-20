import React, { useState, useEffect, useCallback } from 'react';
import "./DocumentChat.css";
import { ChevronRight, File, Folder } from 'lucide-react';
import { ChatDisplay } from '../components/ChatDisplay';
import { ChatInput } from '../components/ChatInput';
import { askTrialDataRAG } from '../lib/osdk';
import { chat } from '../lib/llmclient';
import { Document, Message, Provider, MessageGroup, OSDKMessage } from '../types';

type UIProvider = {
  id: 'chatgpt' | 'anthropic';
  provider: Provider;
  model: string;
  name: string;
  enabled: boolean;
  apiKey: string;
}

const DocumentChat: React.FC = () => {
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
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

  const documents: Document = {
    id: 'root',
    name: 'Document Collections',
    type: 'folder',
    children: [
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

  const handleSendMessage = (message: string): void => {
    setQuestionCount(prev => prev + 1);
    const answers: Message[] = providers.filter(m=> m.enabled).map(m => ({role: 'assistant', content: '', provider: m.name}))
    const newMsg: MessageGroup = { started: false, groupId: `${questionCount}`,  question: {role: 'user', content: message }, answers: answers};
    console.log("setMessages")
    setMessages(prevMessages => [...prevMessages, newMsg]);
    setLoadingLLM(true);
    //askTrialDataRAG(message, history, sendChatCB);
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
          
          {isFolder ? <Folder className="icon" /> : <File className="icon" />}
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
        <div className="sidebar-header">Selected Collections: {selectedDocs.length}</div>
        {documents && documents.children?.map(item => renderItem(item))}
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
        <div className="header">
          <h1>Legal Document Analysis</h1>
          <h2>Selected Collections: {selectedDocs.length}</h2>
        </div>

        <ChatDisplay messages={messages} />
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};

export default DocumentChat;