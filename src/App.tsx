import React, { useState } from 'react';
import { FileText, CloudIcon, CheckSquare } from 'lucide-react';
import WordCloudTab from './components/WordCloudTab';
import ResumeTab from './components/ResumeTab';
import ATSChecker from './components/ATSChecker';

function App() {
  const [activeTab, setActiveTab] = useState<'wordcloud' | 'resume' | 'ats'>('wordcloud');
  const [selectedWords, setSelectedWords] = useState<string[]>([]);

  const handleSaveWords = (words: string[]) => {
    setSelectedWords(words);
    setActiveTab('resume');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Resume Optimizer</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('wordcloud')}
              className={`
                ${activeTab === 'wordcloud'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              `}
            >
              <CloudIcon className="mr-2 h-5 w-5" />
              Word Cloud Generator
            </button>
            <button
              onClick={() => setActiveTab('resume')}
              className={`
                ${activeTab === 'resume'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              `}
            >
              <FileText className="mr-2 h-5 w-5" />
              Resume Analyzer
            </button>
            <button
              onClick={() => setActiveTab('ats')}
              className={`
                ${activeTab === 'ats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              `}
            >
              <CheckSquare className="mr-2 h-5 w-5" />
              ATS Checker
            </button>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow min-h-[600px]">
          {activeTab === 'wordcloud' ? (
            <WordCloudTab onSaveWords={handleSaveWords} />
          ) : activeTab === 'resume' ? (
            <ResumeTab selectedWords={selectedWords} />
          ) : (
            <ATSChecker selectedWords={selectedWords} />
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            © 2025 Resume Optimizer. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;