import React from 'react';
import { MessageGroup } from '../types';
import { ChatMessage } from './ChatMessage';

interface ChatDisplayProps {
  messages: MessageGroup[];
}

export const ChatDisplay: React.FC<ChatDisplayProps> = ({ messages }) => {
  return (
    <div className="messages-container">
        {messages.map((group) => (
          <React.Fragment key={group.groupId}>
            <div className={`message-wrapper ${group.question.role}`}>
              <ChatMessage message={group.question} />
            </div>
            <div className={`message-wrapper ${group.answers[0].role}`}>
                {group.answers.map((message, i) => (
                  <ChatMessage key={i} message={message} />
                ))}
            </div>
          </React.Fragment>
        ))}
    </div>
  );
};