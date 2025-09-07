'use client';
import { useState, useEffect } from 'react';
import { Button, Textarea, Card, Label, Badge } from '@/components/ui/index';
import { Volume2, Play, Pause, Download } from 'lucide-react';

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
}

interface AudioResult {
  audioUrl: string;
  fileName: string;
  metadata: {
    voiceId: string;
    model: string;
    fileSize: number;
  };
}

export default function AudioTestPage() {
  const [text, setText] = useState('Hello! This is a test of the enhanced ElevenLabs service with v3 features.');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [predefinedVoices, setPredefinedVoices] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    try {
      const response = await fetch('/api/audio');
      const data = await response.json();
      
      if (data.success && data.voices) {
        setVoices(data.voices);
      }
      
      if (data.predefinedVoices) {
        setPredefinedVoices(data.predefinedVoices);
        setSelectedVoice(data.predefinedVoices.RACHEL || Object.values(data.predefinedVoices)[0]);
      }
      
      if (data.models) {
        setModels(data.models);
        setSelectedModel(data.models.TURBO_V2_5 || Object.values(data.models)[0]);
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
    }
  };

  const generateAudio = async () => {
    if (!text.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: selectedVoice,
          model: selectedModel
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAudioResult({
          audioUrl: data.audioUrl,
          fileName: data.fileName,
          metadata: data.metadata
        });
      } else {
        throw new Error(data.error || 'Audio generation failed');
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      alert('Failed to generate audio: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleAudio = () => {
    if (!audioResult) return;
    
    if (!audioElement) {
      const audio = new Audio(audioResult.audioUrl);
      audio.addEventListener('ended', () => setIsPlaying(false));
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent mb-4">
            ElevenLabs v3 Audio Testing
          </h1>
          <Badge variant="secondary">Enhanced Voice Generation Service</Badge>
        </div>

        <Card className="p-8 shadow-2xl border-0 bg-white/80 backdrop-blur-sm mb-6">
          <div className="space-y-6">
            {/* Text Input */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                Text to Convert to Speech
              </Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter the text you want to convert to speech..."
                className="min-h-[120px] text-base border-2 focus:border-yellow-500 rounded-xl resize-none"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Voice Selection */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Voice Selection
                </Label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 outline-none"
                >
                  <optgroup label="Predefined Voices">
                    {Object.entries(predefinedVoices).map(([name, id]) => (
                      <option key={id} value={id}>
                        {name} ({id.slice(0, 8)}...)
                      </option>
                    ))}
                  </optgroup>
                  {voices.length > 0 && (
                    <optgroup label="Available Voices">
                      {voices.map((voice) => (
                        <option key={voice.voice_id} value={voice.voice_id}>
                          {voice.name} - {voice.category}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Model Selection */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Model Selection
                </Label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-yellow-500 outline-none"
                >
                  {Object.entries(models).map(([name, id]) => (
                    <option key={id} value={id}>
                      {name} ({id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={generateAudio}
              disabled={isGenerating || !text.trim()}
              className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating Audio...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5" />
                  Generate Audio with v3 Features
                </div>
              )}
            </Button>
          </div>
        </Card>

        {/* Audio Result */}
        {audioResult && (
          <Card className="p-6 shadow-xl bg-white/90 backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-4">Generated Audio</h3>
            
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">
                <p><strong>File:</strong> {audioResult.fileName}</p>
                <p><strong>Voice:</strong> {audioResult.metadata.voiceId.slice(0, 8)}...</p>
                <p><strong>Model:</strong> {audioResult.metadata.model}</p>
                <p><strong>Size:</strong> {(audioResult.metadata.fileSize / 1024).toFixed(1)} KB</p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={toggleAudio} variant="outline">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                
                <Button asChild variant="outline">
                  <a href={audioResult.audioUrl} download={audioResult.fileName}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <audio
                controls
                src={audioResult.audioUrl}
                className="w-full"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          </Card>
        )}

        <div className="text-center mt-8 text-sm text-gray-500">
          <p>✨ Enhanced ElevenLabs integration with v3 features, better error handling, and reusable service architecture ✨</p>
        </div>
      </div>
    </div>
  );
}
