"use client";
import React, { useState } from 'react';
import { GripVertical, ChevronDown, ChevronUp } from 'lucide-react';

interface Section {
  id: string | number;
  title?: string;
  name?: string;
  order?: number;
  subsections?: Subsection[];
  [key: string]: any;
}

interface Subsection {
  id: string | number;
  name: string;
  description?: string;
  order?: number;
  materials?: any[];
  [key: string]: any;
}

interface ReorderableSectionProps {
  section: Section;
  index: number;
  isReorderMode: boolean;
  onSectionReorder: (fromIndex: number, toIndex: number) => void;
  onSubsectionReorder: (sectionId: number, fromIndex: number, toIndex: number) => void;
  onSubsectionMoveToSection: (fromSectionId: number, fromSubsectionIndex: number, toSectionId: number, toSubsectionIndex: number) => void;
  renderSectionContent: (section: Section) => React.ReactNode;
  renderSubsectionContent: (subsection: Subsection, sectionId: string | number) => React.ReactNode;
  setDraggedElement?: (element: string | null) => void;
}

export function ReorderableSection({
  section,
  index,
  isReorderMode,
  onSectionReorder,
  onSubsectionReorder,
  onSubsectionMoveToSection,
  renderSectionContent,
  renderSubsectionContent,
  setDraggedElement
}: ReorderableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragOverSection, setIsDragOverSection] = useState(false);
  const [, setDraggedSubsectionId] = useState<string | number | null>(null);

  const handleDragStart = (e: React.DragEvent) => {
    if (!isReorderMode) return;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    if (setDraggedElement) {
      setDraggedElement(index.toString());
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOverIndex(null);
    if (setDraggedElement) {
      setDraggedElement(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isReorderMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!isReorderMode) return;
    e.preventDefault();
    
    const data = e.dataTransfer.getData('text/plain');
    if (data.startsWith('subsection-')) {
      setIsDragOverSection(true);
      setDraggedSubsectionId(data);
    } else {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isReorderMode) return;
    // Only clear if we're leaving the entire section, not just a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
      setIsDragOverSection(false);
      setDraggedSubsectionId(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isReorderMode) return;
    e.preventDefault();
    setDragOverIndex(null);
    setIsDragOverSection(false);
    setDraggedSubsectionId(null);
    
    const data = e.dataTransfer.getData('text/plain');
    
    // Sprawdź czy to podsekcja (format: "subsection-sectionId-subsectionIndex")
    if (data.startsWith('subsection-')) {
      const parts = data.split('-');
      const fromSectionId = parseInt(parts[1]);
      const fromSubsectionIndex = parseInt(parts[2]);
      
      // Przenieś podsekcję do tej sekcji na koniec (gdy upuszczamy na sekcję)
      const toSubsectionIndex = sortedSubsections.length;
      onSubsectionMoveToSection(fromSectionId, fromSubsectionIndex, Number(section.id), toSubsectionIndex);
    } else {
      // To jest sekcja (format: "sectionIndex")
      const fromIndex = parseInt(data);
      if (fromIndex !== index) {
        onSectionReorder(fromIndex, index);
      }
    }
  };

  const sortedSubsections = section.subsections 
    ? isReorderMode 
      ? section.subsections // W trybie reorder używaj kolejności z tablicy
      : [...section.subsections].sort((a, b) => (a.order || 0) - (b.order || 0))
    : [];

  return (
    <div
      draggable={isReorderMode}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ${
        isDragging ? 'opacity-50 shadow-lg scale-105' : ''
      } ${
        dragOverIndex === index ? 'border-blue-400 bg-blue-50 shadow-lg' : ''
      } ${
        isDragOverSection ? 'border-purple-400 bg-purple-50 shadow-lg ring-2 ring-purple-200' : ''
      } ${
        isReorderMode ? 'cursor-move' : ''
      } ${
        isReorderMode && !isDragOverSection ? 'hover:border-orange-300 hover:bg-orange-50' : ''
      }`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3 flex-1">
          {/* Drag Handle */}
          {isReorderMode && (
            <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-colors">
              <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </div>
          )}
          
          {/* Section Title */}
          <h3 className="text-lg font-semibold text-gray-900 flex-1">
            {section.title || section.name || 'Sekcja bez tytułu'}
            {isDragOverSection && (
              <span className="ml-2 text-purple-600 text-sm font-medium">
                ← Upuść tutaj
              </span>
            )}
          </h3>
        </div>
        
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={isExpanded ? "Zwiń sekcję" : "Rozwiń sekcję"}
        >
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>
      </div>
      
      {/* Section Content */}
      {isExpanded && (
        <div className="p-4">
          <div className="space-y-3">
            {/* Renderuj zawartość sekcji */}
            {renderSectionContent(section)}
            
            {/* Podsekcje */}
            {sortedSubsections.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Podsekcje:</h4>
                <div className="space-y-2">
                  {sortedSubsections.map((subsection, subsectionIndex) => (
                    <ReorderableSubsection
                      key={`${subsection.id}-${subsectionIndex}`}
                      subsection={subsection}
                      sectionId={section.id}
                      index={subsectionIndex}
                      isReorderMode={isReorderMode}
                      onSubsectionReorder={onSubsectionReorder}
                      onSubsectionMoveToSection={onSubsectionMoveToSection}
                      renderSubsectionContent={renderSubsectionContent}
                      setDraggedElement={setDraggedElement}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ReorderableSubsectionProps {
  subsection: Subsection;
  sectionId: string | number;
  index: number;
  isReorderMode: boolean;
  onSubsectionReorder: (sectionId: number, fromIndex: number, toIndex: number) => void;
  onSubsectionMoveToSection: (fromSectionId: number, fromSubsectionIndex: number, toSectionId: number, toSubsectionIndex: number) => void;
  renderSubsectionContent: (subsection: Subsection, sectionId: string | number) => React.ReactNode;
  setDraggedElement?: (element: string | null) => void;
}

function ReorderableSubsection({
  subsection,
  sectionId,
  index,
  isReorderMode,
  onSubsectionReorder,
  onSubsectionMoveToSection,
  renderSubsectionContent,
  setDraggedElement
}: ReorderableSubsectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragOverSubsection, setIsDragOverSubsection] = useState(false);
  const [, setDraggedData] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent) => {
    if (!isReorderMode) return;
    e.stopPropagation(); // Zatrzymaj propagację do sekcji nadrzędnej
    const data = `subsection-${sectionId}-${index}`;
    console.log('Subsection drag start:', { data, sectionId, index });
    setIsDragging(true);
    setDraggedData(data);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', data);
    if (setDraggedElement) {
      setDraggedElement(data);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOverIndex(null);
    setDraggedData(null);
    if (setDraggedElement) {
      setDraggedElement(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isReorderMode) return;
    e.preventDefault();
    e.stopPropagation(); // Zatrzymaj propagację do sekcji nadrzędnej
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!isReorderMode) return;
    e.preventDefault();
    e.stopPropagation(); // Zatrzymaj propagację do sekcji nadrzędnej
    
    console.log('Subsection drag enter:', { sectionId, index });
    
    // W trybie reorder, zawsze pokaż wskaźniki dla podsekcji
    // (może to być podsekcja przeciągana z tej samej lub innej sekcji)
    setDragOverIndex(index);
    setIsDragOverSubsection(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isReorderMode) return;
    e.stopPropagation(); // Zatrzymaj propagację do sekcji nadrzędnej
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
      setIsDragOverSubsection(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isReorderMode) return;
    e.preventDefault();
    e.stopPropagation(); // Zatrzymaj propagację do sekcji nadrzędnej
    setDragOverIndex(null);
    setIsDragOverSubsection(false);
    
    const data = e.dataTransfer.getData('text/plain');
    console.log('Subsection drop:', { data, sectionId, index });
    
    // Sprawdź czy to podsekcja (format: "subsection-sectionId-subsectionIndex")
    if (data.startsWith('subsection-')) {
      const parts = data.split('-');
      const fromSectionId = parseInt(parts[1]);
      const fromSubsectionIndex = parseInt(parts[2]);
      
      console.log('Subsection drop details:', { fromSectionId, fromSubsectionIndex, toSectionId: Number(sectionId), toIndex: index });
      
      if (fromSectionId === Number(sectionId) && fromSubsectionIndex !== index) {
        // Przenieś w ramach tej samej sekcji
        console.log('Reordering within same section');
        console.log('Calling onSubsectionReorder with:', { sectionId: Number(sectionId), fromSubsectionIndex, toIndex: index });
        onSubsectionReorder(Number(sectionId), fromSubsectionIndex, index);
        console.log('onSubsectionReorder called successfully');
      } else if (fromSectionId !== Number(sectionId)) {
        // Przenieś do innej sekcji w konkretnym miejscu
        console.log('Moving to different section');
        onSubsectionMoveToSection(fromSectionId, fromSubsectionIndex, Number(sectionId), index);
      }
    }
  };

  return (
    <div
      draggable={isReorderMode}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ${
        isDragging ? 'opacity-50 shadow-lg scale-105' : ''
      } ${
        dragOverIndex === index ? 'border-blue-400 bg-blue-100 shadow-lg' : ''
      } ${
        isDragOverSubsection ? 'border-green-400 bg-green-100 shadow-lg ring-2 ring-green-200' : ''
      } ${
        isReorderMode ? 'cursor-move' : ''
      } ${
        isReorderMode && !isDragOverSubsection ? 'hover:border-green-300 hover:bg-green-50' : ''
      }`}
    >
      {/* Subsection Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2 flex-1">
          {/* Drag Handle */}
          {isReorderMode && (
            <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded transition-colors">
              <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </div>
          )}
          
          {/* Subsection Info */}
          <div className="flex-1">
            <h4 className="text-base font-medium text-gray-900">
              {subsection.name}
              {isDragOverSubsection && (
                <span className="ml-2 text-green-600 text-sm font-medium">
                  ← Upuść tutaj
                </span>
              )}
            </h4>
            {subsection.description && (
              <p className="text-sm text-gray-600 mt-1">
                {subsection.description}
              </p>
            )}
          </div>
        </div>
        
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title={isExpanded ? "Zwiń podsekcję" : "Rozwiń podsekcję"}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>
      
      {/* Subsection Content */}
      {isExpanded && (
        <div className="p-3">
          {renderSubsectionContent(subsection, sectionId)}
        </div>
      )}
    </div>
  );
}
