import React, { useState } from 'react';
import './ChatInput.css'
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isDisabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isDisabled}) => {
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  return (
    <div className="chat-input-container">
      <div className="textarea-wrapper">
      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Ask a question about your documents..."
        className="chat-textarea"
        rows={3}
        //onKeyDown={(e) => e.key === 'Enter' && handleSend()}
      />
      <button id="send-button" title={isDisabled ? 'Select documents to enable chat' : ''}
         className={isDisabled ? 'disabled' : ''} disabled={isDisabled} onClick={handleSend}>
        <Send className="send-icon" />
      </button>
      </div>
    </div>
  );
};