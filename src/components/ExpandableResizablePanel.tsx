import React, { useState, useRef, ReactNode, MouseEvent as ReactMouseEvent } from "react";
import "./ExpandableResizablePanel.css";

interface ExpandableResizablePanelProps {
  children: ReactNode;
  minWidth?: number; // Optional prop for min width
}

export const ExpandableResizablePanel: React.FC<ExpandableResizablePanelProps> = ({ children, minWidth }) => {
  const [width, setWidth] = useState<number>(300); // Initial width
  const panelRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef<boolean>(false);

  const startResizing = (e: ReactMouseEvent<HTMLDivElement>) => {
    isResizing.current = true;
    document.addEventListener("mousemove", resizePanel);
    document.addEventListener("mouseup", stopResizing);
  };

  const resizePanel = (e: MouseEvent) => {
    if (isResizing.current && panelRef.current) {
      const newWidth = e.clientX - panelRef.current.getBoundingClientRect().left;
      if (newWidth >= (minWidth || 0)) {
        setWidth(newWidth);
      }
    }
  };
  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", resizePanel);
    document.removeEventListener("mouseup", stopResizing);
  };

  return (
    <div className="panel-container">
      <div ref={panelRef} className="panel" style={{ width: `${width}px` }}>
        <div className="panel-content">{children}</div>
        {/* Resizer Handle */}
        <div className="resizer" onMouseDown={startResizing}></div>
      </div>
    </div>
  );
};

