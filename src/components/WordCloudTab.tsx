import React, { useState, useCallback, useEffect, useRef } from 'react';
import { removeStopwords } from 'stopword';
import { Save, RefreshCw, HelpCircle } from 'lucide-react';
import { select } from 'd3-selection';
import cloud from 'd3-cloud';

type CloudType = 'single' | 'multi' | 'both';

interface Word {
  text: string;
  value: number;
  selected?: boolean;
  size?: number;
  x?: number;
  y?: number;
  rotate?: number;
}

interface WordCloudTabProps {
  onSaveWords: (words: string[]) => void;
}

export default function WordCloudTab({ onSaveWords }: WordCloudTabProps) {
  const [inputText, setInputText] = useState(localStorage.getItem('wordCloudInput') || '');
  const [words, setWords] = useState<Word[]>([]);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [cloudType, setCloudType] = useState<CloudType>('single');
  const [useTrigrams, setUseTrigrams] = useState(false);
  const [excludedWords, setExcludedWords] = useState<Set<string>>(new Set());
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    localStorage.setItem('wordCloudInput', inputText);
  }, [inputText]);

  const resetVisual = () => {
    setWords([]);
    setSelectedWords(new Set());
    setExcludedWords(new Set());
    processText(inputText);
  };

  const generateNgrams = (text: string, n: number, limit: number) => {
  const words = text.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
  const cleanWords = removeStopwords(words).filter(word => word.length > 2);
  const ngrams: Record<string, number> = {};

  for (let i = 0; i <= cleanWords.length - n; i++) {
    const phrase = cleanWords.slice(i, i + n).join(' ');
    if (!excludedWords.has(phrase)) {
      ngrams[phrase] = (ngrams[phrase] || 0) + 1;
    }
  }

  return Object.entries(ngrams)
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

  const processText = useCallback((text: string) => {
  let processedWords: Word[] = [];

  if (cloudType === 'single') {
    processedWords = generateNgrams(text, 1, 15);
  } else if (cloudType === 'multi') {
    processedWords = useTrigrams ? generateNgrams(text, 3, 15) : generateNgrams(text, 2, 15);
  } else if (cloudType === 'both') {
    const unigrams = generateNgrams(text, 1, 15);
    const multiWords = useTrigrams ? generateNgrams(text, 3, 15) : generateNgrams(text, 2, 15);
    processedWords = [...unigrams, ...multiWords];
  }

  setWords(processedWords);
}, [cloudType, useTrigrams, excludedWords]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setInputText(newText);
    processText(newText);
  };

  const toggleWordExclusion = (word: string) => {
  setExcludedWords(prev => {
    const newSet = new Set(prev);
    if (newSet.has(word)) {
      newSet.delete(word);
    } else {
      newSet.add(word);
    }
    return newSet;
  });
  processText(inputText);
};

  const handleSave = () => {
  const visibleWords = words
    .filter(w => !excludedWords.has(w.text))
    .map(w => w.text);
  onSaveWords(visibleWords);
};

  useEffect(() => {
  processText(inputText);
}, [cloudType, useTrigrams, excludedWords]);

  useEffect(() => {
    if (!words.length || !svgRef.current) return;

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll('*').remove();

    const layout = cloud()
      .size([width, height])
      .words(words.map(d => ({
        ...d,
        size: 10 + (d.value * 10),
      })))
      .padding(5)
      .rotate(() => (~~(Math.random() * 2) * 90))
      .font('Impact')
      .fontSize(d => d.size!)
      .on('end', draw);

    function draw(words: Word[]) {
  const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

  g.selectAll('text')
    .data(words)
    .join('text')
    .style('font-family', 'Impact')
    .style('cursor', 'pointer')
    .style('fill', d => {
      if (excludedWords.has(d.text)) return '#9CA3AF';
      if (cloudType === 'both') {
        return d.text.includes(' ') ? '#16a34a' : '#2563eb';
      }
      return cloudType === 'single' ? '#2563eb' : '#16a34a';
    })
    .attr('text-anchor', 'middle')
    .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
    .attr('font-size', d => `${d.size}px`)
    .text(d => d.text)
    .on('click', (_, d) => toggleWordExclusion(d.text));
}

    layout.start();
  }, [words, cloudType, excludedWords]);

  return (
    <div className="flex flex-col md:flex-row h-full gap-6 p-6">
      <div className="w-full md:w-2/5 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Please Paste Your Text Below</h2>
          <div className="flex items-center gap-4">
            <select
              value={cloudType}
              onChange={(e) => setCloudType(e.target.value as CloudType)}
              className="px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="single">One Word-Cloud</option>
              <option value="multi">Multi Word-Cloud</option>
              <option value="both">Both Options</option>
            </select>
            
            {(cloudType === 'multi' || cloudType === 'both') && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useTrigrams}
                    onChange={(e) => setUseTrigrams(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Use Trigrams</span>
                  <div className="relative group">
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                    <div className="hidden group-hover:block absolute z-10 w-64 p-2 bg-white rounded-lg shadow-lg text-sm text-gray-600 -right-2 top-6">
                      Experimental: Generate 3-word phrases instead of 2-word phrases
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        <textarea
          className="w-full h-96 p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={inputText}
          onChange={handleTextChange}
          placeholder="Paste your text here..."
          maxLength={10000}
        />
      </div>

      <div className="w-full md:w-3/5 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Word Cloud</h2>
          <div className="flex gap-2">
            <button onClick={resetVisual} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Save className="w-5 h-5" />
              Save & Use in Resume Analysis
            </button>
          </div>
        </div>

        <div className="h-96 border rounded-lg shadow-sm bg-white">
          <svg ref={svgRef} width="100%" height="100%" />
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Exclude Words</h3>
          <div className="flex flex-wrap gap-2">
            {words.map((word) => (
              <label key={word.text} className="flex items-center gap-2 p-2 border rounded-lg">
                <input
                  type="checkbox"
                  checked={excludedWords.has(word.text)}
                  onChange={() => toggleWordExclusion(word.text)}
                />
                <span className={`text-gray-700 ${excludedWords.has(word.text) ? 'line-through' : ''}`}>
                  {word.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}