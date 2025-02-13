import "./LeftNav.css";
import { MessagesSquare, SquarePen} from 'lucide-react';
import { Message, MessageGroup } from '../types';

interface RecentChatProps {
  handleSetCurrentChat: (chatLog: any[]) => void;
  recentChats: any[];
}
export const RecentChats: React.FC<RecentChatProps> = ({ handleSetCurrentChat, recentChats }) => {

  const handleNewChat = () => {
    handleSetCurrentChat([]);
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
    handleSetCurrentChat(groups)
  };


    return (
        <section className="recent-chats">
            <h5>Recent</h5>
            <div className="sidebar-header">
                <button onClick={handleNewChat}><SquarePen /></button>
            </div>
            <ul>
                {recentChats && [...recentChats].reverse().map(c => (
                <li key={c[0].threadId}><a onClick={() => handleGetChat(c)}><MessagesSquare width="16px" height="16px" /> {c[0].message}</a></li>
                ))}
            </ul>
        </section>
    );
};
