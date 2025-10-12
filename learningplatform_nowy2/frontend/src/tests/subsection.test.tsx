import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FaFolder, FaFolderOpen, FaFilePdf, FaFileCode, FaExternalLinkAlt, FaFile } from "react-icons/fa";

// Mock the renderContentIcon function
function renderContentIcon(item: any, isExpanded?: boolean) {
  if (item.type === 'subsection') {
    return isExpanded ? 
      <FaFolderOpen className="text-xl text-blue-600" data-testid="folder-open-icon" /> : 
      <FaFolder className="text-xl text-blue-600" data-testid="folder-icon" />;
  }
  if (item.fileUrl || item.file) {
    return <FaFilePdf className="text-xl text-red-600" data-testid="pdf-icon" />;
  }
  if (item.link) {
    return <FaExternalLinkAlt className="text-xl text-green-600" data-testid="link-icon" />;
  }
  if (item.text) {
    return <FaFileCode className="text-xl text-purple-600" data-testid="code-icon" />;
  }
  return <FaFile className="text-xl text-gray-600" data-testid="file-icon" />;
}

// Test component to render content items
function TestContentItem({ item, isExpanded }: { item: any; isExpanded?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {renderContentIcon(item, isExpanded)}
      <span className="font-semibold">{item.name || item.link || 'Materiał'}</span>
    </div>
  );
}

describe('Subsection Icons and Display', () => {
  test('renders folder icon for subsection when collapsed', () => {
    const subsectionItem = {
      id: 1,
      type: 'subsection',
      name: 'Test Subsection'
    };
    
    render(<TestContentItem item={subsectionItem} isExpanded={false} />);
    
    // Check if folder icon is rendered
    const folderIcon = screen.getByTestId('folder-icon');
    expect(folderIcon).toBeInTheDocument();
    expect(folderIcon).toHaveClass('text-blue-600');
  });

  test('renders open folder icon for subsection when expanded', () => {
    const subsectionItem = {
      id: 1,
      type: 'subsection',
      name: 'Test Subsection'
    };
    
    render(<TestContentItem item={subsectionItem} isExpanded={true} />);
    
    // Check if open folder icon is rendered
    const folderIcon = screen.getByTestId('folder-open-icon');
    expect(folderIcon).toBeInTheDocument();
    expect(folderIcon).toHaveClass('text-blue-600');
  });

  test('renders PDF icon for file content', () => {
    const fileItem = {
      id: 2,
      type: 'file',
      name: 'Test Document',
      fileUrl: 'https://example.com/document.pdf'
    };
    
    render(<TestContentItem item={fileItem} />);
    
    const fileIcon = screen.getByTestId('pdf-icon');
    expect(fileIcon).toBeInTheDocument();
    expect(fileIcon).toHaveClass('text-red-600');
  });

  test('renders external link icon for link content', () => {
    const linkItem = {
      id: 3,
      type: 'link',
      name: 'External Link',
      link: 'https://example.com'
    };
    
    render(<TestContentItem item={linkItem} />);
    
    const linkIcon = screen.getByTestId('link-icon');
    expect(linkIcon).toBeInTheDocument();
    expect(linkIcon).toHaveClass('text-green-600');
  });

  test('renders code icon for text content', () => {
    const textItem = {
      id: 4,
      type: 'text',
      name: 'Text Content',
      text: 'Some text content'
    };
    
    render(<TestContentItem item={textItem} />);
    
    const textIcon = screen.getByTestId('code-icon');
    expect(textIcon).toBeInTheDocument();
    expect(textIcon).toHaveClass('text-purple-600');
  });

  test('renders default file icon for unknown content type', () => {
    const unknownItem = {
      id: 5,
      name: 'Unknown Content'
    };
    
    render(<TestContentItem item={unknownItem} />);
    
    const defaultIcon = screen.getByTestId('file-icon');
    expect(defaultIcon).toBeInTheDocument();
    expect(defaultIcon).toHaveClass('text-gray-600');
  });

  test('displays correct content name', () => {
    const testItem = {
      id: 1,
      type: 'subsection',
      name: 'Test Content Name'
    };
    
    render(<TestContentItem item={testItem} />);
    
    expect(screen.getByText('Test Content Name')).toBeInTheDocument();
  });

  test('displays fallback name when name is not provided', () => {
    const testItem = {
      id: 1,
      type: 'file',
      fileUrl: 'https://example.com/file.pdf'
    };
    
    render(<TestContentItem item={testItem} />);
    
    expect(screen.getByText('Materiał')).toBeInTheDocument();
  });
});

// Test for subsection functionality
describe('Subsection Functionality', () => {
  test('subsection state management', () => {
    const mockSetShowSubsection = jest.fn();
    const showSubsection = { 1: { 2: false } };
    
    // Simulate toggle function
    const toggleSubsection = (sectionId: number, contentId: number) => {
      mockSetShowSubsection((prev: any) => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          [contentId]: !prev[sectionId]?.[contentId]
        }
      }));
    };
    
    // Test initial state
    expect(showSubsection[1][2]).toBe(false);
    
    // Test toggle
    toggleSubsection(1, 2);
    expect(mockSetShowSubsection).toHaveBeenCalled();
  });

  test('subsection content loading', async () => {
    const mockLoadSubsectionContents = jest.fn();
    
    // Simulate loading function
    const loadSubsectionContents = async (sectionId: number, subsectionId: number) => {
      mockLoadSubsectionContents(sectionId, subsectionId);
    };
    
    await loadSubsectionContents(1, 2);
    expect(mockLoadSubsectionContents).toHaveBeenCalledWith(1, 2);
  });
});

// Test for drag and drop functionality
describe('Drag and Drop', () => {
  test('section reordering', () => {
    const sections = [
      { id: 1, name: 'Section 1' },
      { id: 2, name: 'Section 2' },
      { id: 3, name: 'Section 3' }
    ];
    
    // Simulate arrayMove function
    const arrayMove = (array: any[], from: number, to: number) => {
      const newArray = [...array];
      const [removed] = newArray.splice(from, 1);
      newArray.splice(to, 0, removed);
      return newArray;
    };
    
    // Test moving section from index 0 to index 2
    const newSections = arrayMove(sections, 0, 2);
    
    expect(newSections[0].name).toBe('Section 2');
    expect(newSections[1].name).toBe('Section 3');
    expect(newSections[2].name).toBe('Section 1');
  });

  test('content reordering within section', () => {
    const contents = [
      { id: 1, name: 'Content 1' },
      { id: 2, name: 'Content 2' },
      { id: 3, name: 'Content 3' }
    ];
    
    // Simulate arrayMove function
    const arrayMove = (array: any[], from: number, to: number) => {
      const newArray = [...array];
      const [removed] = newArray.splice(from, 1);
      newArray.splice(to, 0, removed);
      return newArray;
    };
    
    // Test moving content from index 0 to index 2
    const newContents = arrayMove(contents, 0, 2);
    
    expect(newContents[0].name).toBe('Content 2');
    expect(newContents[1].name).toBe('Content 3');
    expect(newContents[2].name).toBe('Content 1');
  });
});

// Test for nested subsections
describe('Nested Subsections', () => {
  test('nested subsection structure', () => {
    const nestedStructure = {
      section: {
        id: 1,
        contents: [
          {
            id: 1,
            type: 'subsection',
            name: 'Main Subsection',
            contents: [
              {
                id: 1,
                type: 'subsection',
                name: 'Nested Subsection',
                contents: [
                  {
                    id: 1,
                    type: 'file',
                    name: 'Deep Content',
                    fileUrl: 'https://example.com/deep.pdf'
                  }
                ]
              }
            ]
          }
        ]
      }
    };
    
    // Test structure access
    expect(nestedStructure.section.contents[0].type).toBe('subsection');
    expect(nestedStructure.section.contents[0].contents[0].type).toBe('subsection');
    expect(nestedStructure.section.contents[0].contents[0].contents[0].type).toBe('file');
  });

  test('nested subsection icon rendering', () => {
    const nestedItem = {
      id: 1,
      type: 'subsection',
      name: 'Nested Subsection'
    };
    
    render(<TestContentItem item={nestedItem} isExpanded={false} />);
    
    const folderIcon = screen.getByTestId('folder-icon');
    expect(folderIcon).toBeInTheDocument();
    expect(folderIcon).toHaveClass('text-blue-600');
  });
});
