import React, { useState } from 'react';
import { FileUp, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import * as mammoth from 'mammoth';

interface ATSCheckerProps {
  selectedWords: string[];
}

interface ReadabilityCheck {
  section: string;
  requirement: string;
  met: boolean;
  details?: string;
}

interface ATSScore {
  overall: number;
  keywordMatch: number;
  formatting: number;
  readability: number;
  certifications: number;
}

interface FontCheck {
  name: string;
  found: boolean;
}

interface Certification {
  name: string;
  found: boolean;
}

export default function ATSChecker({ selectedWords }: ATSCheckerProps) {
  const [resumeText, setResumeText] = useState('');
  const [readabilityChecks, setReadabilityChecks] = useState<ReadabilityCheck[]>([]);
  const [fontChecks, setFontChecks] = useState<FontCheck[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [atsScore, setATSScore] = useState<ATSScore>({
    overall: 0,
    keywordMatch: 0,
    formatting: 0,
    readability: 0,
    certifications: 0
  });
  const [keywordMatches, setKeywordMatches] = useState<{word: string, count: number}[]>([]);
  const [missingKeywords, setMissingKeywords] = useState<string[]>([]);

  const analyzeReadability = (text: string) => {
    const sections = [
      { name: 'Name/Header', requirement: '18-24 pt', regex: /^.+?\n/ },
      { name: 'Section Headings', requirement: '12-14 pt (Bold)', regex: /^[A-Z][^a-z]+:?$/m },
      { name: 'Body Text', requirement: '10-12 pt', regex: /^(?![A-Z][^a-z]+:?$).+$/m },
      { name: 'Bullet Points', requirement: '10-11 pt', regex: /^[•·-].+$/m }
    ];

    const checks = sections.map(section => ({
      section: section.name,
      requirement: section.requirement,
      met: section.regex.test(text),
      details: section.regex.test(text) ? 'Present and properly formatted' : 'Missing or improperly formatted'
    }));

    setReadabilityChecks(checks);
    return checks.filter(check => check.met).length / checks.length * 100;
  };

  const analyzeFonts = (text: string) => {
    const allowedFonts = [
      { name: 'Calibri', regex: /font-family:\s*Calibri/i },
      { name: 'Arial', regex: /font-family:\s*Arial/i },
      { name: 'Times New Roman', regex: /font-family:\s*Times New Roman/i },
      { name: 'Helvetica', regex: /font-family:\s*Helvetica/i }
    ];

    const checks = allowedFonts.map(font => ({
      name: font.name,
      found: font.regex.test(text)
    }));

    setFontChecks(checks);
    return checks.filter(check => check.found).length > 0 ? 100 : 0;
  };

  const analyzeCertifications = (text: string) => {
    // Example certifications - in a real app, these would come from the job description
    const requiredCerts = [
      { name: 'PMP', regex: /PMP|Project Management Professional/i },
      { name: 'AWS', regex: /AWS|Amazon Web Services/i },
      { name: 'CISSP', regex: /CISSP|Certified Information Systems Security Professional/i }
    ];

    const checks = requiredCerts.map(cert => ({
      name: cert.name,
      found: cert.regex.test(text)
    }));

    setCertifications(checks);
    return checks.filter(check => check.found).length / checks.length * 100;
  };

  const analyzeKeywords = (text: string) => {
    const textLower = text.toLowerCase();
    const words = textLower.split(/\s+/);
    
    const matches = selectedWords.map(word => {
      const wordLower = word.toLowerCase();
      const count = words.filter(w => w === wordLower).length;
      return { word, count };
    }).filter(match => match.count > 0);

    const missing = selectedWords.filter(word => 
      !textLower.includes(word.toLowerCase())
    );

    setKeywordMatches(matches);
    setMissingKeywords(missing);

    return (matches.length / selectedWords.length) * 100;
  };

  const calculateFormattingScore = (text: string) => {
    const checks = [
      text.includes('\n\n'), // Proper spacing
      /[A-Z][^a-z]+:/.test(text), // Section headers
      /^[•·-]/.test(text), // Bullet points
      text.length > 300, // Minimum content
      !/[^\x00-\x7F]/.test(text) // No special characters
    ];

    return (checks.filter(Boolean).length / checks.length) * 100;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      const text = result.value;
      setResumeText(text);

      const keywordScore = analyzeKeywords(text);
      const readabilityScore = analyzeReadability(text);
      const formattingScore = calculateFormattingScore(text);
      const fontScore = analyzeFonts(text);
      const certScore = analyzeCertifications(text);

      setATSScore({
        keywordMatch: keywordScore,
        readability: readabilityScore,
        formatting: formattingScore,
        certifications: certScore,
        overall: (keywordScore + readabilityScore + formattingScore + certScore) / 4
      });
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-6 p-6">
      <div className="w-full md:w-1/2 flex flex-col gap-6">
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
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">ATS Score</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Overall Score:</span>
              <span className="font-bold text-xl">{atsScore.overall.toFixed(1)}%</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Keyword Match:</span>
                <span>{atsScore.keywordMatch.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Formatting:</span>
                <span>{atsScore.formatting.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Readability:</span>
                <span>{atsScore.readability.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Certifications:</span>
                <span>{atsScore.certifications.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Readability Check</h2>
          <div className="space-y-4">
            {readabilityChecks.map((check, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                {check.met ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-1" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 mt-1" />
                )}
                <div>
                  <h3 className="font-semibold">{check.section}</h3>
                  <p className="text-sm text-gray-600">Required: {check.requirement}</p>
                  <p className="text-sm text-gray-500">{check.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Font Check</h2>
          <div className="space-y-4">
            {fontChecks.map((font, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {font.found ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
                <span className="text-gray-700">{font.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Certification Check</h2>
          <div className="space-y-4">
            {certifications.map((cert, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {cert.found ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="text-gray-700">{cert.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Keyword Analysis</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-green-600 mb-3">Matched Keywords</h3>
              <div className="space-y-2">
                {keywordMatches.map(({ word, count }) => (
                  <div key={word} className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>{word}</span>
                    <span className="text-gray-500">({count} times)</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-600 mb-3">Missing Keywords</h3>
              <div className="space-y-2">
                {missingKeywords.map(word => (
                  <div key={word} className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span>{word}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}