import React, { useState, ReactElement } from 'react';
import { Settings } from 'lucide-react';
import './GearMenu.css';

interface Action {
  label: string;
  icon?: ReactElement;
  onClick: () => void;
}

interface GearMenuProps {
  actions: Action[];
}

export const GearMenu: React.FC<GearMenuProps> = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleActionClick = (actionFn: () => void) => {
    actionFn();
    setIsOpen(false);
  };
  return (
    <div className="gear-menu">
      <Settings className="gear-icon"  stroke='#333' onClick={() => setIsOpen(!isOpen)} />
      {isOpen && (
        <div className="menu-popup">
          {actions.map((action, index) => (
            <button key={index} className="menu-item" onClick={() => handleActionClick(action.onClick)}>
              {action?.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
