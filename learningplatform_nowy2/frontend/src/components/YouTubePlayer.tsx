import React, { useState, useEffect } from 'react';

interface YouTubePlayerProps {
  youtubeUrl: string;
  title?: string;
  className?: string;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ youtubeUrl, title, className = '' }) => {
  const [videoId, setVideoId] = useState<string>('');
  const [embedUrl, setEmbedUrl] = useState<string>('');

  // Extract video ID from YouTube URL
  useEffect(() => {
    const extractVideoId = (url: string): string => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : '';
    };

    const id = extractVideoId(youtubeUrl);
    setVideoId(id);
    
    if (id) {
      setEmbedUrl(`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&showinfo=0`);
    }
  }, [youtubeUrl]);

  if (!videoId) {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <div className="text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          <p className="text-lg font-medium">Nieprawidłowy link YouTube</p>
          <p className="text-sm">Sprawdź czy link jest poprawny</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* YouTube Embed */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={embedUrl}
          title={title || 'YouTube Video'}
          className="absolute top-0 left-0 w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Title Overlay */}
      {title && (
        <div className="absolute top-4 left-4 right-4">
          <h3 className="text-white text-lg font-semibold bg-black/50 px-3 py-1 rounded">
            {title}
          </h3>
        </div>
      )}

      {/* YouTube Link */}
      <div className="absolute bottom-4 right-4">
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          YouTube
        </a>
      </div>
    </div>
  );
};

export default YouTubePlayer;










