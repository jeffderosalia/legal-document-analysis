import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import './Collapsible.css';


interface CollapsibleSectionProps {
  id: string;
  title: string;
  className: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
}
interface CollapsibleGroupProps {
  defaultOpen?: string;
  children: React.ReactElement<CollapsibleSectionProps>[];
}

export const CollapsibleSection = ({ title, children, isOpen, onToggle, className = ''}: CollapsibleSectionProps) => {

  return (
    <section className={`collapsible-section ${isOpen ? 'open' : ''} ${className}`}>
      <button 
        onClick={() => onToggle?.()}
        className="collapsible-button"
      >
        {isOpen ? 
          <Minus className="collapsible-icon" /> : 
          <Plus className="collapsible-icon" />
        }
        <span className="collapsible-title">{title}</span>
      </button>
      
      {isOpen && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </section>
  );
};
   
export const CollapsibleGroup = ({ children, defaultOpen }: CollapsibleGroupProps) => {
    const [openId, setOpenId] = useState<string | null>(defaultOpen || null);

    return React.Children.map(children, child =>
        React.cloneElement(child, {
            isOpen: child.props.id === openId,
            onToggle: () => setOpenId(child.props.id === openId ? null : child.props.id)
        })
    );
};
  