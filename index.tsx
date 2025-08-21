import React, { useState, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from '@google/genai';

interface KeyMoment {
  t: number;
  label: string;
}

interface VideoItem {
  videoId: string;
  title: string;
  hasTranscript: boolean;
  summary?: string;
  keyMoments?: KeyMoment[];
  transcript: string;
  thumbnailUrl: string;
}

const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (h > 0) parts.push(h);
  parts.push(m.toString().padStart(h > 0 ? 2 : 1, '0'));
  parts.push(s.toString().padStart(2, '0'));
  return parts.join(':');
};

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [result, setResult] = useState<VideoItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  const extractVideoId = (inputUrl: string): string | null => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = inputUrl.match(regex);
    return match ? match[1] : null;
  };

  const handleSummarize = async (e: FormEvent) => {
    e.preventDefault();
    const videoId = extractVideoId(url);

    if (!videoId) {
      setError('Please enter a valid YouTube video URL.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on your public knowledge of the YouTube video with ID "${videoId}", provide the following information. Do not invent facts.
- title: The official video title.
- hasTranscript: A boolean indicating if you can generate a transcript.
- summary: A short summary (2-3 sentences).
- keyMoments: From the transcript you generate, extract an array of 2-5 key moments, each with a timestamp in seconds ('t') and a label ('label'). If no transcript can be generated, provide an empty array.
- transcript: A detailed transcript of the video's content. If you cannot generate one, provide an empty string.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              hasTranscript: { type: Type.BOOLEAN },
              summary: { type: Type.STRING },
              keyMoments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    t: { type: Type.NUMBER },
                    label: { type: Type.STRING }
                  },
                  required: ['t', 'label']
                }
              },
              transcript: { type: Type.STRING },
            },
            required: ['title', 'hasTranscript', 'summary', 'keyMoments', 'transcript'],
          },
        },
      });

      const videoData = JSON.parse(response.text);
      setResult({
        ...videoData,
        videoId,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    } catch (err) {
      console.error(err);
      setError('Failed to summarize the video. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderVideoCard = (video: VideoItem) => (
    <div className="video-card single-result">
      <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer">
        <img
          src={video.thumbnailUrl}
          alt={`Thumbnail for ${video.title}`}
          className="video-thumbnail"
        />
      </a>
      <div className="video-card-content">
        <h2 className="video-title">{video.title}</h2>
        <p className="video-summary">{video.summary}</p>
        <div className="video-card-actions">
          <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" className="youtube-button">
            View on YouTube
          </a>
          <button
            className="transcript-button"
            onClick={() => setSelectedVideo(video)}
            disabled={!video.hasTranscript || !video.transcript}
          >
            View Transcript
          </button>
        </div>
      </div>
    </div>
  );

  const renderSkeleton = () => (
    <div className="skeleton-card shimmer">
      <div className="skeleton-thumbnail"></div>
      <div className="skeleton-content">
        <div className="skeleton-text title"></div>
        <div className="skeleton-text summary-line"></div>
        <div className="skeleton-text summary-line"></div>
        <div className="skeleton-text summary-line-short"></div>
        <div className="skeleton-actions">
          <div className="skeleton-button"></div>
          <div className="skeleton-button"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container">
      <header className="header">
        <div className="title-wrapper">
          <svg
            className="title-icon"
            viewBox="0 0 28 20"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M27.3233 3.065A3.5 3.5 0 0 0 24.8543 0.596C22.6833 0 14 0 14 0S5.31667 0 3.14567 0.596A3.5 3.5 0 0 0 0.67667 3.065C0.08067 5.236 0 10 0 10s0.08067 4.764 0.67667 6.935a3.5 3.5 0 0 0 2.469 2.469C5.31667 19.999 14 19.999 14 19.999s8.6833 0 10.8543-0.595a3.5 3.5 0 0 0 2.469-2.469c0.596-2.171 0.676-6.935 0.676-6.935s-0.08-4.764-0.677-6.935ZM11.1667 14.333V5.667L18.5 10l-7.3333 4.333Z" />
          </svg>
          <h1>Video Prism</h1>
        </div>
        <p>Paste a YouTube URL to get an AI-powered summary and transcript.</p>
      </header>

      <form className="search-form" onSubmit={handleSummarize}>
        <div className="search-input-wrapper">
           <svg
            className="search-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="e.g., https://www.youtube.com/watch?v=..."
            className="search-input"
            aria-label="YouTube video URL"
          />
        </div>
        <button type="submit" className="search-button" disabled={isLoading}>
          {isLoading ? 'Analyzing...' : 'Summarize'}
        </button>
      </form>

      <div className="results-container">
        {isLoading && renderSkeleton()}
        {error && <div className="error-message">{error}</div>}
        
        {result && !isLoading && renderVideoCard(result)}
      </div>

      {selectedVideo && (
        <div className="modal-overlay" onClick={() => setSelectedVideo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-button"
              onClick={() => setSelectedVideo(null)}
              aria-label="Close modal"
            >
              &times;
            </button>
            <div className="modal-header">
              <h2 className="modal-title">Transcript: {selectedVideo.title}</h2>
            </div>
            {selectedVideo.keyMoments && selectedVideo.keyMoments.length > 0 && (
              <div className="modal-key-moments">
                <h3 className="key-moments-title">Key Moments</h3>
                <div className="key-moments-grid">
                  {selectedVideo.keyMoments.map((moment) => (
                    <a
                      key={moment.t}
                      href={`https://www.youtube.com/watch?v=${selectedVideo.videoId}&t=${moment.t}s`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="key-moment-chip"
                    >
                      <span className="timestamp">{formatDuration(moment.t)}</span>
                      {moment.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <p className="modal-body">{selectedVideo.transcript || 'Transcript not available.'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);