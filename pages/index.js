'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const [lanyardData, setLanyardData] = useState(null);
  const [volume, setVolume] = useState(0.5);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [appleMusicData, setAppleMusicData] = useState(null);
  const audioRef = useRef(null);
  const discordId = '924822581117337691'; // Replace with your Discord ID

  // Fetch Lanyard data and set up WebSocket
  useEffect(() => {
    const fetchLanyard = async () => {
      try {
        const response = await fetch(`https://api.lanyard.rest/v1/users/${discordId}`);
        const data = await response.json();
        if (data.success) {
          setLanyardData(data.data);
        }
      } catch (error) {
        console.error('Error fetching Lanyard data:', error);
      }
    };

    fetchLanyard();

    const ws = new WebSocket('wss://api.lanyard.rest/socket');

    ws.onopen = () => {
      const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ op: 3 }));
        }
      }, 30000);

      ws.send(
        JSON.stringify({
          op: 2,
          d: {
            subscribe_to_ids: [discordId],
          },
        })
      );

      return () => clearInterval(heartbeatInterval);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.t === 'INIT_STATE' || data.t === 'PRESENCE_UPDATE') {
        setLanyardData(data.d[discordId] || data.d);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed.');
    };

    return () => {
      ws.close();
    };
  }, [discordId]);

  // Mock Apple Music data fetch (replace with real API later)
  useEffect(() => {
    // Placeholder for testing
    const mockAppleMusicFetch = () => {
      setAppleMusicData({
        song: 'Blinding Lights',
        artist: 'The Weeknd',
      });
    };
    mockAppleMusicFetch();

    // Real Apple Music API integration (uncomment when ready)
    /*
    const initializeMusicKit = async () => {
      try {
        // Load MusicKit JS
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });

        // Configure MusicKit with your developer token
        await window.MusicKit.configure({
          developerToken: 'YOUR_JWT_TOKEN', // Generate via Apple Developer portal
          app: {
            name: 'mntymnty',
            build: '1.0',
          },
        });

        const music = window.MusicKit.getInstance();
        await music.authorize(); // Prompts user login

        // Fetch recently played tracks
        const response = await fetch(
          'https://api.music.apple.com/v1/me/recent/played/tracks?limit=1',
          {
            headers: {
              Authorization: `Bearer ${music.developerToken}`,
              'Music-User-Token': music.musicUserToken,
            },
          }
        );
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          setAppleMusicData({
            song: data.data[0].attributes.name,
            artist: data.data[0].attributes.artistName,
          });
        }
      } catch (error) {
        console.error('Apple Music API error:', error);
      }
    };
    initializeMusicKit();
    */
  }, []);

  // Handle audio playback and volume
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      const playAudio = async () => {
        try {
          await audio.play();
        } catch (error) {                             
          console.log('Autoplay prevented:', error);
          const handleInteraction = () => {
            audio.play().catch((err) => console.log('Interaction play failed:', err));
            document.removeEventListener('click', handleInteraction);
          };
          document.addEventListener('click', handleInteraction);
        }
      };
      playAudio();
    }
  }, [volume]);

  // Toggle volume slider
  const toggleVolumeSlider = () => {
    setShowVolumeSlider((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden select-none ">
      {/* Background Video with Blur */}
      <video
        src="https://r2.guns.lol/afe3915a-1128-4e01-999a-7d989422f35c.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover blur-sm"
      />

      {/* Audio Player */}
      <audio
        ref={audioRef}
        src="https://r2.guns.lol/4432f0ed-aa51-4f9c-a8de-847cf59bd40e.mp3"
        loop
        className="hidden"
      />

      <cursor>
        
      </cursor>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center max-w-xl w-full p-6 bg-black/20 rounded-2xl backdrop-blur-sm border-2 border-white/5">
              <div className="flex flex-col items-center mb-6">
            <div className="overflow-hidden">
              
            </div>
            <h1 className="text-5xl font-semibold mt-4 glowing-text">Welcome to</h1>
            <h1 className="text-5xl font-semibold glowing-text">mnty.space</h1>
            
            <p className="text-lg text-white/70"></p>
          </div>

      <div>
                







          <div className="mb-6">
                    {/* Discord Status Box */}
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/20 text-white/80 shadow-lg">
                      <div className="flex items-center space-x-4">
                        {/* Avatar with Status Border */}
                        <div className="relative">
                          <Image
                            src={
                              lanyardData?.discord_user?.avatar
                                ? `https://cdn.discordapp.com/avatars/${discordId}/${lanyardData.discord_user.avatar}.png`
                                : 'https://r2.guns.lol/eb8194b2-7fec-4f3d-bcee-3a7102cf8058.webp'
                            }
                            alt="Avatar"
                            width={80}
                            height={80}
                            draggable="false"
                            className={`rounded-full border-2 ${
                              lanyardData?.discord_status === 'online'
                                ? 'border-green-500'
                                : lanyardData?.discord_status === 'idle'
                                ? 'border-yellow-500'
                                : lanyardData?.discord_status === 'dnd'
                                ? 'border-red-500'
                                : 'border-gray-500'
                            }`}
                          />
                        </div>

                        {/* Username and Status */}
                        <div className="flex-1">
                          <h1 className="text-2xl font-semibold text-white glowing-text">mnty</h1>
                          <div className="text-sm">
                            <p>Discord: {lanyardData?.discord_user?.username || 'culx'}</p>
                            <p>
                              Status:{' '}
                              {lanyardData?.activities?.length && lanyardData.activities[0]?.type === 0
                                ? lanyardData.activities[0].name
                                  ? `Playing ${lanyardData.activities[0].name}`
                                  : 'Online'
                                : lanyardData?.discord_status || 'Offline'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>


      











          </div>
          <div className="flex mb-6 items-center space-x-4 p-4 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 shadow-lg">
        <Image
          src="https://i.snipp.gg/924822581117337691/69b1f07461b3ed00de93cf1b1a535651.jpg"
          alt="Bubblegum Album Cover"
          width={100}
          height={100}
          draggable="false"
          className="rounded-xl border-2 border-black/40 mt-0" // Removed mt-6 for alignment
        />
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-sm text-white/60 glowing-text">Now Playing</p>
          <p className="text-lg font-medium text-white glowing-text">Bubblegum by NewJeans</p>
        </div>
      </div>

        {/* Social Links */}
        <div className="flex space-x-4 mb-6">
          {[
            {
              href: 'https://snapchat.com/add/itwasmattress',
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-white glowing-icon"
                  viewBox="0 0 256 256"
                  fill="currentColor"
                >
                  <path d="M245.47 189.74c-7.1 6.67-17.67 7.71-27.88 8.72c-6.31.62-12.83 1.27-16.39 3.23c-3.37 1.86-6.85 6.62-10.21 11.22c-5.4 7.41-11.53 15.8-21.23 18.28a26.35 26.35 0 0 1-6.64.81c-6.88 0-13.7-2.32-19.9-4.43c-5.55-1.89-10.8-3.68-15.21-3.68s-9.66 1.79-15.21 3.68c-8.19 2.79-17.47 6-26.54 3.62c-9.71-2.48-15.84-10.87-21.24-18.28c-3.36-4.6-6.84-9.36-10.21-11.22c-3.56-2-10.08-2.61-16.38-3.23c-10.22-1-20.79-2.05-27.89-8.72a8 8 0 0 1 2.77-13.36c.09 0 12.84-4.86 25.36-19a94 94 0 0 0 17.74-30.2L37 119.43a8 8 0 1 1 6-14.86l17.85 7.15A151.24 151.24 0 0 0 64 80a64 64 0 0 1 128 0a149 149 0 0 0 3.21 31.73l17.79-7.16a8 8 0 1 1 6 14.86l-19.3 7.72c14.08 38.35 42.64 49.09 43 49.23a8 8 0 0 1 2.77 13.36" />
                </svg>
              ),
            },
            {
              href: 'https://youtube.com/@mnty3',
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-white glowing-icon"
                  viewBox="1.99 5 20.01 14.01"
                  fill="currentColor"
                >
                  <path d="M21.593 7.203a2.506 2.506 0 0 0-1.762-1.766C18.265 5.007 12 5 12 5s-6.264-.007-7.831.404a2.56 2.56 0 0 0-1.766 1.778c-.413 1.566-.417 4.814-.417 4.814s-.004 3.264.406 4.814c.23.857.905 1.534 1.763 1.765c1.582.43 7.83.437 7.83.437s6.265.007 7.831-.403a2.515 2.515 0 0 0 1.767-1.763c.414-1.565.417-4.812.417-4.812s.02-3.265-.407-4.831zM9.996 15.005l.005-6l5.207 3.005l-5.212 2.995z" />
                </svg>
              ),
            },
            {
              href: 'https://instagram.com/itwasmattress',
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-white glowing-icon"
                  viewBox="3 2.98 18.01 18.04"
                  fill="currentColor"
                >
                  <path d="M20.947 8.305a6.53 6.53 0 0 0-.419-2.216a4.61 4.61 0 0 0-2.633-2.633a6.606 6.606 0 0 0-2.186-.42c-.962-.043-1.267-.055-3.709-.055s-2.755 0-3.71.055a6.606 6.606 0 0 0-2.185.42a4.607 4.607 0 0 0-2.633 2.633a6.554 6.554 0 0 0-.419 2.185c-.043.963-.056 1.268-.056 3.71s0 2.754.056 3.71c.015.748.156 1.486.419 2.187a4.61 4.61 0 0 0 2.634 2.632a6.584 6.584 0 0 0 2.185.45c.963.043 1.268.056 3.71.056s2.755 0 3.71-.056a6.59 6.59 0 0 0 2.186-.419a4.615 4.615 0 0 0 2.633-2.633c.263-.7.404-1.438.419-2.187c.043-.962.056-1.267.056-3.71c-.002-2.442-.002-2.752-.058-3.709zm-8.953 8.297c-2.554 0-4.623-2.069-4.623-4.623s2.069-4.623 4.623-4.623a4.623 4.623 0 0 1 0 9.246zm4.807-8.339a1.077 1.077 0 0 1-1.078-1.078a1.077 1.077 0 1 1 2.155 0c0 .596-.482 1.078-1.077 1.078z" />
                  <circle cx="11.994" cy="11.979" r="3.003" fill="currentColor" />
                </svg>
              ),
            },
            
          ].map((social, index) => (
            <Link
              key={index}
              href={social.href}
              target="_blank"
              className="p-2 transition-all hover:scale-110"
            >
              {social.icon}
            </Link>
          ))}
        </div>

        {/* Volume Control */}
        <div className="relative flex items-center justify-center w-full">
          <button
            onClick={toggleVolumeSlider}
            className={`p-2 rounded-full hover:scale-105 transition-all duration-300 ease-in-out glowing-icon ${
              showVolumeSlider ? '-translate-x-[80px]' : 'translate-x-0'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-white"
              viewBox="0 0 48 48"
              fill="currentColor"
            >
              <path
                d="M24 6v36c-7 0-12.201-9.16-12.201-9.16H6a2 2 0 0 1-2-2V17.01a2 2 0 0 1 2-2h5.799S17 6 24 6Z"
                fill="#555"
              />
              <path
                d="M32 15a11.91 11.91 0 0 1 1.684 1.859A12.07 12.07 0 0 1 36 24c0 2.654-.846 5.107-2.278 7.09A11.936 11.936 0 0 1 32 33"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M34.236 41.186C40.084 37.696 44 31.305 44 24c0-7.192-3.796-13.496-9.493-17.02"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div
            className={`absolute flex items-center bg-black/40 backdrop-blur-md rounded-full px-4 py-2 transition-all duration-300 ease-in-out transform ${
              showVolumeSlider ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
            }`}
            style={{ left: '50%', transformOrigin: 'center', translate: '-50% 0', marginLeft: '10px' }}
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-28 h-1 bg-white/20 rounded-full appearance-none cursor-pointer transition-all duration-200 ease-out"
            />
          </div>
        </div>

        {/* Page Views */}
        <div className="absolute bottom-4 left-4 flex items-center space-x-1 text-sm text-white/70">
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 9a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3m0 8a5 5 0 0 1-5-5a5 5 0 0 1 5-5a5 5 0 0 1 5 5a5 5 0 0 1-5 5m0-12.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5" />
          </svg>
          <span>1</span>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .glowing-text {
          text-shadow: 0 0 16.5px #ffffff;
        }
        .glowing-icon {
          filter: drop-shadow(0 0 10px #ffffff);
        }
        ::selection {
          background: #ffffff;
          color: #000000;
        }
        input[type='range'] {
          -webkit-appearance: none;
        }
        input[type='range']::-webkit-slider-runnable-track {
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
          transition: background 0.2s ease-out;
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          margin-top: -4px;
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.7);
          transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
        }
        input[type='range']:hover::-webkit-slider-thumb {
          transform: scale(1.15);
          box-shadow: 0 0 18px rgba(255, 255, 255, 0.9);
        }
        input[type='range']::-moz-range-track {
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
          transition: background 0.2s ease-out;
        }
        input[type='range']::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.7);
          transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
        }
        input[type='range']:hover::-moz-range-thumb {
          transform: scale(1.15);
          box-shadow: 0 0 18px rgba(255, 255, 255, 0.9);
        }
        body, .relative {
          cursor: url('https://r2.guns.lol/d00514c2-675b-4854-a2b1-fd079b94941b.webp'), auto !important;
        }
      `}</style>
    </div>
  );
}