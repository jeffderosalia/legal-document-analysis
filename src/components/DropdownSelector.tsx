import { useState, useRef, useEffect } from "react";
import "./DropdownSelector.css";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { UIProvider } from "../types";

interface ChatInputProps {
  setProviders: React.Dispatch<React.SetStateAction<UIProvider[]>>;
  providers: UIProvider[];
}

export const DropdownSelector: React.FC<ChatInputProps> = ({providers, setProviders}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('Select...');
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const selected = providers.filter(m=> m.enabled);
    if (selected.length == 0) {
      setDisplay('Select...')
    } else if (selected.length == 1) {
      setDisplay(selected[0].name)
    } else {
      setDisplay(`Multiple (${selected.length})`)
    }
  }, [providers]);

  const handleChange = (provider: UIProvider) => {
    setProviders(
      (prev: UIProvider[]) => prev.map(p => p.id === provider.id ? {...p, enabled: !p.enabled} : p)
    );
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="dropdown-container">
      <button onClick={() => setIsOpen(!isOpen)} className="dropdown-button">
        {display}
        {
          (isOpen ? <ChevronUp stroke="#aaa" /> : <ChevronDown stroke="#aaa"  />)
        }
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          {providers.map(provider => (
            <label key={provider.id}>
              <input 
                type="checkbox"
                checked={provider.enabled}
                onChange={() => handleChange(provider)}
              />
              {provider.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

