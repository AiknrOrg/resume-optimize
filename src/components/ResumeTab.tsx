import React, { useState, useEffect, useRef } from 'react';
import { FileUp, Download, FileText, Wand2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import * as mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import html2canvas from 'html2canvas';

interface ResumeTabProps {
  selectedWords: string[];
}

interface DocumentMetadata {
  originalFormat: string;
  styling: {
    fonts?: string[];
    colors?: string[];
    spacing?: string;
    paragraphs?: { type: string; content: string }[];
  };
}

interface Change {
  original: string;
  optimized: string;
  type: 'keyword' | 'enhancement' | 'metric';
  context: string;
}

export default function ResumeTab({ selectedWords }: ResumeTabProps) {
  const [manualEdit, setManualEdit] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileName, setFileName] = useState('');
  const [optimizedText, setOptimizedText] = useState('');
  const [documentMetadata, setDocumentMetadata] = useState<DocumentMetadata | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  const extractDocumentMetadata = async (file: File): Promise<DocumentMetadata> => {
    const metadata: DocumentMetadata = {
      originalFormat: file.type,
      styling: {
        fonts: ['Arial', 'Times New Roman'],
        colors: ['#000000'],
        spacing: '1.15',
        paragraphs: []
      }
    };

    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      try {
        const result = await mammoth.extractRawText({ 
          arrayBuffer: await file.arrayBuffer(),
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p => p:fresh"
          ]
        });
        
        // Extract paragraphs and their styles
        const paragraphs = result.value.split('\n\n').map(content => ({
          type: 'paragraph',
          content: content.trim()
        }));
        
        metadata.styling.paragraphs = paragraphs;
      } catch (error) {
        console.error('Error extracting document metadata:', error);
      }
    }

    return metadata;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileType(file.type);
    setFileName(file.name);
    setChanges([]); // Reset changes

    try {
      const metadata = await extractDocumentMetadata(file);
      setDocumentMetadata(metadata);

      if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
        const cleanHtml = DOMPurify.sanitize(result.value);
        setResumeText(cleanHtml);
        processText(cleanHtml);
      } else {
        alert("Please upload a Word document (.docx)");
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
    }
  };

  const findPhraseMatches = (text: string, phrases: string[]): string[] => {
    const matches: string[] = [];
    phrases.forEach(phrase => {
      const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push(match[0]);
      }
    });
    return matches;
  };

  const processText = (text: string) => {
    let processed = text;
    const newChanges: Change[] = [];

    // Process both single words and phrases
    selectedWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      processed = processed.replace(regex, (match, offset) => {
        const context = text.slice(Math.max(0, offset - 30), offset + match.length + 30);
        newChanges.push({
          original: match,
          optimized: match,
          type: 'keyword',
          context: `...${context}...`
        });
        return `<mark class="bg-yellow-100 hover:bg-yellow-200 cursor-help relative group">
          ${match}
          <span class="hidden group-hover:block absolute z-10 bg-white p-2 rounded shadow-lg text-sm">
            Matched keyword from Word Cloud
          </span>
        </mark>`;
      });
    });

    setChanges(newChanges);
    setOptimizedText(DOMPurify.sanitize(processed));
  };

  const handleEnhance = () => {
    let enhanced = optimizedText;
    const newChanges = [...changes];

    // Strong action verbs for enhancement
    const actionVerbReplacements: Record<string, string[]> = {
      'worked': ['spearheaded', 'executed', 'implemented'],
      'made': ['created', 'developed', 'established'],
      'helped': ['facilitated', 'supported', 'guided'],
      'responsible for': ['led', 'managed', 'orchestrated'],
      'did': ['accomplished', 'achieved', 'completed'],
      'improved': ['optimized', 'enhanced', 'streamlined']
    };

    // Replace weak verbs
    Object.entries(actionVerbReplacements).forEach(([weak, strong]) => {
      const regex = new RegExp(`\\b${weak}\\b`, 'gi');
      enhanced = enhanced.replace(regex, (match, offset) => {
        const replacement = strong[Math.floor(Math.random() * strong.length)];
        const context = optimizedText.slice(Math.max(0, offset - 30), offset + match.length + 30);
        newChanges.push({
          original: match,
          optimized: replacement,
          type: 'enhancement',
          context: `...${context}...`
        });
        return `<mark class="bg-green-100 hover:bg-green-200 cursor-help relative group">
          ${replacement}
          <span class="hidden group-hover:block absolute z-10 bg-white p-2 rounded shadow-lg text-sm">
            Original: "${match}"<br>
            Enhanced for stronger impact
          </span>
        </mark>`;
      });
    });

    // Highlight metrics (excluding dates and common numbers)
    const metricRegex = /\b(?!\d{1,2}\/\d{1,2}\/\d{2,4})\d+(?:,\d{3})*(?:\.\d+)?(?:\s*%|\s+(?:percent|users|customers|dollars|revenue|growth|increase|decrease|improvement))\b/gi;
    enhanced = enhanced.replace(metricRegex, (match, offset) => {
      const context = optimizedText.slice(Math.max(0, offset - 30), offset + match.length + 30);
      newChanges.push({
        original: match,
        optimized: match,
        type: 'metric',
        context: `...${context}...`
      });
      return `<mark class="bg-blue-100 hover:bg-blue-200 cursor-help relative group">
        ${match}
        <span class="hidden group-hover:block absolute z-10 bg-white p-2 rounded shadow-lg text-sm">
          Quantifiable Achievement
        </span>
      </mark>`;
    });

    setOptimizedText(DOMPurify.sanitize(enhanced));
    setChanges(newChanges);
  };

  const handleSaveToPDF = async () => {
    if (!editorRef.current) return;

    try {
      const canvas = await html2canvas(editorRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
      pdf.save("optimized_resume.pdf");
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleSaveToWord = () => {
    try {
      // Remove highlighting but keep the optimized text
      const cleanText = optimizedText.replace(/<\/?[^>]+(>|$)/g, '');
      
      // Create a blob with Word formatting
      const wordContent = `
        <html xmlns:w="urn:schemas-microsoft-com:office:word">
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: ${documentMetadata?.styling?.fonts?.[0] || 'Arial'};
                line-height: ${documentMetadata?.styling?.spacing || '1.15'};
              }
              h1, h2 { margin-top: 1em; }
              p { margin: 0.5em 0; }
            </style>
          </head>
          <body>
            ${cleanText}
          </body>
        </html>
      `;
      
      const blob = new Blob([wordContent], { type: 'application/msword' });
      saveAs(blob, "optimized_resume.docx");
    } catch (error) {
      console.error('Error saving Word document:', error);
      alert('Error saving Word document. Please try again.');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-6 p-6">
      <div className="w-full md:w-1/3 flex flex-col gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Selected Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {selectedWords.map((word) => (
              <span key={word} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {word}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Upload Resume</h2>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <FileUp className="w-10 h-10 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">DOCX files only</p>
            </div>
            <input type="file" className="hidden" accept=".docx" onChange={handleFileUpload} />
          </label>
          {fileName && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Uploaded: <span className="font-medium">{fileName}</span>
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Changes Summary</h2>
          <div className="space-y-3">
            {changes.map((change, index) => (
              <div key={index} className="text-sm p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    change.type === 'keyword' ? 'bg-yellow-100 text-yellow-800' :
                    change.type === 'enhancement' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {change.type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-500 line-through">{change.original}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-green-500">{change.optimized}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500 italic">
                  Context: {change.context}
                </div>
              </div>
            ))}
            {changes.length === 0 && (
              <p className="text-sm text-gray-500 italic">No changes made yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="w-full md:w-2/3 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Analyzed & Optimized Resume</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={manualEdit}
                onChange={(e) => setManualEdit(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Allow Manual Edit</span>
            </label>

            <button
              onClick={handleEnhance}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Wand2 size={20} />
              Enhance Resume Using AI
            </button>

            <button
              onClick={handleSaveToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileText size={20} />
              Save to PDF
            </button>

            <button
              onClick={handleSaveToWord}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download size={20} />
              Save to Word
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
          <div
            ref={editorRef}
            contentEditable={manualEdit}
            className="prose max-w-none p-4 border rounded-md focus:outline-none min-h-[500px]"
            dangerouslySetInnerHTML={{ __html: optimizedText }}
            style={{
              fontFamily: documentMetadata?.styling?.fonts?.[0] || 'Arial',
              lineHeight: documentMetadata?.styling?.spacing || '1.15'
            }}
          />
        </div>
      </div>
    </div>
  );
}
