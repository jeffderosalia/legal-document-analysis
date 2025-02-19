import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import './CollapsibleSection.css';

interface CollapsibleSectionProps {
  title: string;
  className: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const CollapsibleSection = ({ title, children, className = '', defaultOpen = false }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className={`collapsible-section ${className}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="collapsible-button"
      >
        {isOpen ? 
          <ChevronDown className="collapsible-icon" /> : 
          <ChevronRight className="collapsible-icon" />
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
