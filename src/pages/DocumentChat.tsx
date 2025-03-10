import React, { useState, useEffect, useCallback } from 'react';
import "./DocumentChat.css";
import { MessagesSquare, SquarePen, PanelLeft} from 'lucide-react';
import { ChatDisplay } from '../components/ChatDisplay';
import { ChatInput } from '../components/ChatInput';
import { DropdownSelector } from '../components/DropdownSelector';
import { CollapsibleSection, CollapsibleGroup } from '../components/Collapsible';
import {DocumentTreePrime} from '../components/DocumentTreePrime'
// import {FileUpload} from '../components/FileUpload'
// import {GearMenu } from '../components/GearMenu'
import { createPrompt, getUser } from '../lib/osdk';
//import { uploadMedia } from '../lib/osdkMedia';
import { allProviders } from '../lib/providers';
import { addToChat, getChatLog } from '../lib/osdkChatLog';
import { chat } from '../lib/llmclient';
import { Message, MessageGroup, UIProvider } from '../types';
import { createChatLog } from "@legal-document-analysis/sdk";
import {Header} from '../components/Header';
import { Serialized } from '@langchain/core/load/serializable';
import { AIMessageChunk, ToolMessage } from '@langchain/core/messages';
import { HandleLLMNewTokenCallbackFields, NewTokenIndices } from '@langchain/core/callbacks/base';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import { getMemories, maybeStoreMemories } from '../lib/memory';

const DocumentChat: React.FC = () => {
  const [user, setUser] = useState<any>();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [recentChats, setRecentChats]= useState<any[]>([])
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [loadingLLM, setLoadingLLM] = useState<Boolean>(false);
  const [messages, setMessages] = useState<MessageGroup[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [providers, setProviders] = useState<UIProvider[]>(allProviders);


  useEffect(() => {
    if (messages.length > 0 && loadingLLM) {
      const historyString = messages.slice(0, -1).map(msg =>
          `USER: ${msg.question.content}

          ASSISTANT: ${msg.answers.map(ans => ans.content).join("\n")}`
        ).join("\n\n")

      const minTokenCount = Math.min(...providers.map(p => p.maxTokens))

      createPrompt(messages[messages.length - 1].question.content, selectedDocs, historyString, minTokenCount, sendChatCB);
    }
  }, [messages, loadingLLM]);

  useEffect(() => {
    const setup = async () => {
      //await fetchDocuments(true);
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
  const sendChatCB = useCallback(async (question: Message[], mediaItems: string[], historyString: string) => {
    console.log("sendChatCB messages at start:", messages);
    setLoadingLLM(false);
    const enabledProviders = providers.filter(p => p.enabled);
    const allMessages = [...question];
    console.log("allMessages");
    console.log(allMessages);
  
    await Promise.all(enabledProviders.map(async (p, index) => {
      let fullResponse = '';

      const writeToChat = (token: string) => {
        //console.log('writeToChat')
        fullResponse += token;
        const newMessages = [...messages];
        newMessages[newMessages.length-1].answers[index].content = fullResponse;
        setMessages(newMessages);
      }

      const onToken = (
        token: string,
        _idx: NewTokenIndices,
        _runId: string,
        _parentRunId?: string | undefined,
        _tags?: string[] | undefined,
        fields?: HandleLLMNewTokenCallbackFields | undefined) => {

          if (fields?.chunk) {
            const chunkAsChatChunk = fields.chunk as ChatGenerationChunk
            const chatMessage = chunkAsChatChunk.message as AIMessageChunk

            if ((chatMessage.tool_calls !== undefined && chatMessage.tool_calls.length > 0) ||
                (chatMessage.tool_call_chunks !== undefined && chatMessage.tool_call_chunks.length > 0)) {
              console.log(`Tool call detected, not rendering token: ${token}`)
              return undefined
            }
          }

        writeToChat(token)
      }

      const saveMemory = async (memories: string) => {
        const lastMessage = messages[messages.length-1]
        console.log("saveMemory")
        if (index === 0) {
          const memory = await maybeStoreMemories(lastMessage, memories)
          if (memory === undefined) {
            console.log("No memory stored")
          } else {
            console.log(`Stored memory: ${memory}`)
          }
        }
      }

      const saveMessage = () => {
        console.log('saveMessage');
        if (index === 0) {
          const lastMessage = messages[messages.length-1]
          storeChatMessage(lastMessage)
        }
      }

      const onComplete = () => {
        writeToChat("\n\n")
        saveMessage()
      }

      const onError = () => {
        fullResponse += "Unexpected error at the provider. Try again later.";
        const newMessages = [...messages];
        newMessages[newMessages.length-1].answers[index].content = fullResponse;
        setMessages(newMessages);
      }

      const onToolStart = (
        _tool: Serialized,
        _input: string,
        _runId: string,
        _parentRunId: string,
        tags: string[]) => {
          console.log("tool started")
          console.log(tags)
      };

      const onToolEnd = (
        _output: ToolMessage,
        _runId: string,
        _parentRunId?: string | undefined,
        _tags?: string[] | undefined) => {
          console.log("tool finished")
          saveMessage()
      };

      const memories = await getMemories(messages[messages.length-1])

      if (p.useTool)
      {
        await chat(p, allMessages, mediaItems, p.apiKey, historyString, memories, {
          streaming: true,
          onToken: onToken,
          onError: onError,
          onToolStart: onToolStart,
          onToolEnd: onToolEnd
        });
  
      } else {
        await chat(p, allMessages, mediaItems, p.apiKey, historyString, memories, {
          streaming: true,
          onToken: onToken,
          onComplete: onComplete,
          onError: onError
        });
      }

      await saveMemory(memories)

    }));
  }, [providers, messages]);;

  /*
  const handleFileUpload = async (file: File) => {
    await uploadMedia(file)
  };*/
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
  const handleSetSelectedDocuments = useCallback((docs: string[]) => {
    setSelectedDocs(docs);
  }, [setSelectedDocs]);



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
          <CollapsibleGroup defaultOpen='docs'>
            <CollapsibleSection id="chats" title="Recent Chats" className="recent-chats">
                <ul>
                  {recentChats && [...recentChats].reverse().map(c => (
                    <li key={c[0].threadId}><a onClick={() => handleGetChat(c)}><MessagesSquare width="16px" height="16px" /> {c[0].message}</a></li>
                  ))}
                </ul>
            </CollapsibleSection>

            <CollapsibleSection id="docs" title="DocumentSets" className="collections-container">
              <DocumentTreePrime setSelectedDocs={handleSetSelectedDocuments} />
            </CollapsibleSection>
          </CollapsibleGroup>


        </div>
      </div>
      {/* </ExpandableResizablePanel> */}

      <div className="main-content">
        {user && (
        <Header givenName={user.givenName} />
        )}
        <p className={selectedDocs.length === 0 ? 'alert warn': 'alert success'}>        Selected Docs: {selectedDocs.length}</p>
        <ChatDisplay messages={messages} />
        <ChatInput isDisabled={selectedDocs.length === 0} onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};

export default DocumentChat;
