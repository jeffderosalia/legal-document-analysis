import React, { useState, useEffect, useCallback } from 'react';
import "./DocumentChat.css";
import { MessagesSquare, SquarePen, PanelLeft} from 'lucide-react';
import { ChatDisplay } from '../components/ChatDisplay';
import { ChatInput } from '../components/ChatInput';
import { DropdownSelector } from '../components/DropdownSelector';
import {CreateCollectionModal} from '../components/CreateCollectionModal'
import { CollapsibleSection, CollapsibleGroup } from '../components/Collapsible';
import { DocumentTreeView } from '../components/DocumentTreeView';
// import { ExpandableResizablePanel } from '../components/ExpandableResizablePanel';
// import {FileUpload} from '../components/FileUpload'
// import {GearMenu } from '../components/GearMenu'
import { createPrompt, getAllDocuments, getUser } from '../lib/osdk';
import { createCollection, getFileCollection, deleteCollection } from '../lib/osdkCollections';
import {uploadMedia} from '../lib/osdkMedia';
import { addToChat, getChatLog } from '../lib/osdkChatLog';
import { chat } from '../lib/llmclient';
import { Document, Message, MessageGroup, UIProvider } from '../types';
import { Osdk  } from "@osdk/client";
import { FileCollection, createChatLog } from "@legal-document-analysis/sdk";
import {Header} from '../components/Header';
import { Serialized } from '@langchain/core/load/serializable';
import { ToolMessage } from '@langchain/core/messages';

const DocumentChat: React.FC = () => {
  const [user, setUser] = useState<any>();
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [collections, setCollections] = useState<Osdk.Instance<FileCollection>[]>([]);
  const [documents, setDocuments] = useState<Document>();
  const [recentChats, setRecentChats]= useState<any[]>([])
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [loadingLLM, setLoadingLLM] = useState<Boolean>(false);
  const [messages, setMessages] = useState<MessageGroup[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [providers, setProviders] = useState<UIProvider[]>([
    { id: 'chatgpt', provider: 'openai', model: 'gpt-4o-2024-11-20', name: 'ChatGPT', enabled: true, apiKey: process.env.VITE_OPENAI_API_KEY || "x" },
    { id: 'anthropic', provider: 'anthropic', model: 'claude-3-5-sonnet-20241022',name: 'Anthropic', enabled: false, apiKey: process.env.VITE_ANTHROPIC_API_KEY || "x" },
    { id: 'anthropic_with_example', provider: 'anthropic_with_example', model: 'claude-3-5-sonnet-20241022',name: 'Anthropic + Example Memo', enabled: false, apiKey: process.env.VITE_ANTHROPIC_API_KEY || "x" }
  ]);

  const actions = [
    { 
      label: 'Create Collection', 
      onClick: () => setIsModalOpen(true) 
    },
    { 
      label: 'Upload File', 
      onClick: () => console.log('delete') 
    }
  ];

  useEffect(() => {
    if (messages.length > 0 && loadingLLM) {
      const historyString = messages.slice(0, -1).map(msg =>
          `USER: ${msg.question.content}
          ASSISTANT: ${msg.answers.map(ans => ans.content).join("\n")}`
        ).join("\n\n")

      createPrompt(messages[messages.length - 1].question.content, selectedDocs, historyString, sendChatCB);
    }
  }, [messages, loadingLLM]);
  const fetchDocuments = async (firstTime: boolean = false) => {
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
    console.log(firstTime);
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
    distinctCollections.sort((a: Document, b: Document) => a.name.localeCompare(b.name));
    if (distinctCollections.length>0) {
      docs.children = [
        ...distinctCollections,
        ...docs.children || []
      ];
    }

    setDocuments(docs);
  };
  useEffect(() => {
    const setup = async () => {
      await fetchDocuments(true);
      const u = await getUser();
      setUser(u);
      const chatLog = await getChatLog(u.id);
      //console.log(chatLog)
      setRecentChats(chatLog);
    };
    setup();
  }, []);

  const storeChatMessage = async (mGroup: MessageGroup) => {
    const threadId = `t${messages[0].when.toISOString().replace(/[-:.]/g,'')}`;
    const chatLogEntry: createChatLog.Params[] = [
      {      
        message: mGroup.question.content,
        when: mGroup.when.toISOString(),
        order: (messages.length*2)-1,
        role: mGroup.question.role,
        threadId: threadId,
        who: user.id
      },
      {      
        message: mGroup.answers[0].content,
        when: mGroup.when.toISOString(),
        order: (messages.length*2),
        role: mGroup.answers[0].role,
        threadId: threadId,
        who: user.id
      }
    ];
    await addToChat(chatLogEntry);
    setRecentChats(prevChats => {
      const threadIndex = prevChats.findIndex(thread => thread[0]?.threadId === threadId);      
      if (threadIndex >= 0) {
      const newChats = [...prevChats];
      newChats[threadIndex].push(...chatLogEntry);
          return newChats;
      } else {
          return [...prevChats, chatLogEntry];
      }
    });
  };
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

  const sendChatCB = useCallback(async (question: Message[], mediaItems: string[]) => {
    console.log("sendChatCB messages at start:", messages);
    setLoadingLLM(false);
    const enabledProviders = providers.filter(p => p.enabled);
    const allMessages = [...question];
    allMessages[0].content += "\nCreate all tables using markdown";
    console.log("allMessages");
    console.log(allMessages);
  
    await Promise.all(enabledProviders.map(async (p, index) => {
      let fullResponse = '';

      const writeToChat = (token: string) => {
        console.log('writeToChat');
        fullResponse += token;
        const newMessages = [...messages];
        newMessages[newMessages.length-1].answers[index].content = fullResponse;
        setMessages(newMessages);
      }

      const saveMessage = () => {
        console.log('saveMessage');
        if (index === 0) {
          storeChatMessage(messages[messages.length-1])
        }
      }
      const onError = () => {
        fullResponse += "Unexpected error at the provider. Try again later.";
        const newMessages = [...messages];
        newMessages[newMessages.length-1].answers[index].content = fullResponse;
        setMessages(newMessages);
      }

      await chat(p.provider, p.model, allMessages, mediaItems, p.apiKey, {
        streaming: true,
        onToken: writeToChat,
        onComplete: saveMessage,
        onError: onError,
        onToolStart: (
          _tool: Serialized,
          _input: string,
          _runId: string,
          _parentRunId: string,
          tags: string[]) => {
          console.log("tool started")
          console.log(tags)
        },
        onToolEnd: (
          _output: ToolMessage,
          _runId: string,
          _parentRunId?: string | undefined,
          _tags?: string[] | undefined) => {
            //saveMessage()
            console.log("tool finished")
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
  const handleFileUpload = async (file: File) => {
    await uploadMedia(file)
  };
  const handleNewChat = () => {
    setMessages([]);
    setQuestionCount(0);
  }
  const handleGetChat = (chatLogs: any[]) => {
    const groups: MessageGroup[] = [];
    let currentGroup: MessageGroup | null = null;
    let groupId = 1;
 
    
    for (const log of chatLogs) {
      const message: Message = {
        role: log.role,
        content: log.message
      };
  
      if (log.role === 'user') {
        currentGroup = {
          groupId: `${groupId}`,
          question: message,
          answers: [],
          when: new Date(log.when)
        };
        groupId++;
        groups.push(currentGroup);
      } else if (log.role === 'assistant' && currentGroup) {
        currentGroup.answers.push(message);
      }
    }

    // Remove groups with no answer
    const cleanedGroups = groups.filter((group) => group.answers.length > 0)

    setMessages(cleanedGroups);
    setQuestionCount(cleanedGroups.length+1);
  };

  const handleSendMessage = (message: string): void => {
    setQuestionCount(prev => prev + 1);
    const answers: Message[] = providers.filter(m=> m.enabled).map(m => ({role: 'assistant', content: '', provider: m.name}))
    const newMsg: MessageGroup = {  groupId: `${questionCount}`,  question: {role: 'user', content: message }, answers: answers, when: new Date()};
    setMessages(prevMessages => [...prevMessages, newMsg]);
    setLoadingLLM(true);
  };



  return (
    <div className="app-container">
      {/* <ExpandableResizablePanel minWidth={256}> */}
        
      <div className={sidebarOpen ? 'sidebar open' : 'sidebar collapsed'}>
        <div id="nav-buttons">
          <button title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'} className="toggle-sidebar button p7" onClick={()=> {setSidebarOpen(!sidebarOpen)}}><PanelLeft stroke='#666'  /></button>
          <button title="Start New Chat" style={{'paddingRight': '40px'}} className={'p7'} onClick={handleNewChat}><SquarePen stroke='#666'  /></button>
          <DropdownSelector setProviders={setProviders} providers={providers} />
        </div>  
        <div className="inner">
          <CreateCollectionModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              documents={selectedDocs}
              onCreateCollection={handleCreateCollection}
            />
          <CollapsibleGroup defaultOpen='docs'>
            <CollapsibleSection id="chats" title="Recent Chats" className="recent-chats">
                <ul>
                  {recentChats && [...recentChats].reverse().map(c => (
                    <li key={c[0].threadId}><a onClick={() => handleGetChat(c)}><MessagesSquare width="16px" height="16px" /> {c[0].message}</a></li>
                  ))}
                </ul>
            </CollapsibleSection>

            <CollapsibleSection id="docs" title="DocumentSets" className="collections-container">
                <DocumentTreeView documents={documents} setSelectedDocs={setSelectedDocs} />
            </CollapsibleSection>
          </CollapsibleGroup>


        </div>
      </div>
      {/* </ExpandableResizablePanel> */}

      <div className="main-content">
        {user && (
        <Header givenName={user.givenName} />
        )}
        <ChatDisplay messages={messages} />
        <ChatInput isDisabled={selectedDocs.length === 0} onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};

export default DocumentChat;