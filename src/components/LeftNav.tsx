import "./LeftNav.css";
import {CreateCollectionModal} from '../components/CreateCollectionModal'
import {FileUpload} from '../components/FileUpload'
import {GearMenu } from '../components/GearMenu'

interface LeftNavProps {
  givenName?: string;
}
export const LeftNav: React.FC<LeftNavProps> = ({ givenName }) => {



    return (
        <div className="sidebar">        
            <CreateCollectionModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            documents={selectedDocs}
            onCreateCollection={handleCreateCollection}
            />
            <section className="collections-container">
            <h5>Document Sets</h5>
            <div className="sidebar-header">
            <GearMenu actions={actions} />

            <div style={{display: 'none'}}>
            <FileUpload onFileSelect={handleFileUpload} />
            </div>
            </div>

            {documents && documents.children?.map(item => renderItem(item))}
            </section>
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
            <section className="provider-options">
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
            </section>
        </div>
    );
};
