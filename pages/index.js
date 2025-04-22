'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CSSTransition } from 'react-transition-group';

export default function Home() {
  const [lanyardData, setLanyardData] = useState(null);
  const [volume, setVolume] = useState(0.5);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [appleMusicData, setAppleMusicData] = useState(null);
  const audioRef = useRef(null);
  const discordId = '924822581117337691'; // Replace with your Discord ID
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);
  const [isContentLoaded, setIsContentLoaded] = useState(false);

  // Manage refs for activity boxes
  const activityRefs = useRef(new Map());
  // Store previous activities to detect changes
  const prevActivitiesRef = useRef([]);

  // Function to get or create a ref for an activity
  const getActivityRef = (key) => {
    if (!activityRefs.current.has(key)) {
      activityRefs.current.set(key, { current: null });
    }
    return activityRefs.current.get(key);
  };

  // Clean up refs that are no longer needed and update previous activities
  useEffect(() => {
    if (lanyardData && lanyardData.activities) {
      const currentActivities = lanyardData.activities
        .filter(activity => activity.type !== 4)
        .map((activity, index) => ({
          ...activity,
          key: `${activity.type}-${activity.name}-${index}`,
        }));

      // Update refs
      const currentActivityKeys = currentActivities.map(activity => activity.key);
      for (const key of activityRefs.current.keys()) {
        if (!currentActivityKeys.includes(key)) {
          activityRefs.current.delete(key);
        }
      }

      // Update previous activities
      prevActivitiesRef.current = currentActivities;
    }
  }, [lanyardData]);

  // Fetch Lanyard data and set up WebSocket
  useEffect(() => {
    const fetchLanyard = async () => {
      try {
        const response = await fetch(`https://api.lanyard.rest/v1/users/${discordId}`);
        const data = await response.json();
        if (data.success) {
          setLanyardData(data.data);
          setIsContentLoaded(true);
        }
      } catch (error) {
        console.error('Error fetching Lanyard data:', error);
        setIsContentLoaded(true); // Still mark as loaded to stop skeleton
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

  // Mock Apple Music data fetch
  useEffect(() => {
    const mockAppleMusicFetch = () => {
      setAppleMusicData({
        song: 'Blinding Lights',
        artist: 'The Weeknd',
      });
    };
    mockAppleMusicFetch();
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

  // Handle avatar load completion
  const handleAvatarLoad = () => {
    setIsAvatarLoading(false);
  };

  // Status border color
  const borderColor = lanyardData?.discord_status === 'online'
    ? 'border-green-500'
    : lanyardData?.discord_status === 'idle'
    ? 'border-yellow-500'
    : lanyardData?.discord_status === 'dnd'
    ? 'border-red-500'
    : 'border-gray-500';

  // Format activity details
  const getActivityDetails = (activity) => {
    switch (activity.type) {
      case 0: // Playing a game
        return activity.name ? `Playing ${activity.name}` : 'Playing a game';
      case 1: // Streaming
        return activity.details ? `Streaming ${activity.details}` : 'Streaming';
      case 2: // Listening
        return activity.details ? `Listening to ${activity.details}` : 'Listening';
      case 3: // Watching
        return activity.details ? `Watching ${activity.details}` : 'Watching';
      case 4: // Custom status
        return activity.state || activity.name || 'Custom Status';
      case 5: // Competing
        return activity.name ? `Competing in ${activity.name}` : 'Competing';
      default:
        return activity.name || 'Unknown Activity';
    }
  };

  // Calculate activity duration
  const getActivityDuration = (activity) => {
    if (!activity.timestamps?.start) return 'N/A';
    const startTime = new Date(activity.timestamps.start);
    const now = new Date();
    const diffMs = now - startTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Get activity icon URL (fixed for Minecraft and other apps)
  const getActivityIcon = (activity) => {
    if (activity.assets?.large_image) {
      // Handle external assets (e.g., Minecraft)
      if (activity.assets.large_image.startsWith('mp:external/')) {
        const externalPath = activity.assets.large_image.replace('mp:external/', '');
        return `https://media.discordapp.net/external/${externalPath}?size=128`;
      }
      // Handle app-specific assets (requires application_id)
      if (activity.application_id) {
        return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png?size=128`;
      }
    }
    return null;
  };

  // Get custom status for the cloud
  const getCustomStatus = () => {
    const customStatus = lanyardData?.activities?.find(activity => activity.type === 4);
    if (customStatus) {
      return getActivityDetails(customStatus);
    }
    return lanyardData?.discord_status || 'Offline';
  };

  // Determine which activities to animate (added or removed)
  const [activitiesToRender, setActivitiesToRender] = useState([]);
  const [enteringActivities, setEnteringActivities] = useState(new Set());
  const [exitingActivities, setExitingActivities] = useState(new Set());

  useEffect(() => {
    if (!lanyardData || !lanyardData.activities) return;

    const currentActivities = lanyardData.activities
      .filter(activity => activity.type !== 4)
      .map((activity, index) => ({
        ...activity,
        key: `${activity.type}-${activity.name}-${index}`,
      }));

    const prevActivities = prevActivitiesRef.current || [];

    // Find added and removed activities
    const prevKeys = new Set(prevActivities.map(activity => activity.key));
    const currentKeys = new Set(currentActivities.map(activity => activity.key));

    const addedKeys = new Set([...currentKeys].filter(key => !prevKeys.has(key)));
    const removedKeys = new Set([...prevKeys].filter(key => !currentKeys.has(key)));

    // Update entering and exiting activities
    setEnteringActivities(addedKeys);
    setExitingActivities(removedKeys);

    // Update activities to render
    setActivitiesToRender(currentActivities);
  }, [lanyardData]);

  // Activity box component
  const ActivityBox = ({ activity, shouldAnimate }) => {
    const activityKey = activity.key;
    const nodeRef = getActivityRef(activityKey);

    const content = (
      <div
        ref={nodeRef}
        className="activity-box flex items-center space-x-4 p-4 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 shadow-lg"
      >
        {/* Activity Icon */}
        <div className="flex items-center justify-center">
          {getActivityIcon(activity) ? (
            <Image
              src={getActivityIcon(activity)}
              alt="Activity Icon"
              width={48}
              height={48}
              className="rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="w-[48px] h-[48px] bg-gray-300 rounded-lg flex items-center justify-center text-gray-600 text-xl"
            style={{ display: getActivityIcon(activity) ? 'none' : 'flex' }}
          >
            {activity.type === 0 ? '🎮' : activity.type === 2 ? '🎵' : activity.type === 4 ? '💬' : '📺'}
          </div>
        </div>
        {/* Activity Details */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-md font-medium text-white glowingуж

          glowing-text">{getActivityDetails(activity)}</p>
          {activity.state && activity.type !== 4 && (
            <p className="text-sm text-white/60">{activity.state}</p>
          )}
          {activity.details && activity.type !== 4 && (
            <p className="text-sm text-white/60">{activity.details}</p>
          )}
        </div>
        {/* Activity Duration */}
        <div className="text-sm text-white/60 bg-white/20 rounded-full px-3 py-1">
          {getActivityDuration(activity)}
        </div>
      </div>
    );

    if (shouldAnimate) {
      return (
        <CSSTransition
          key={activityKey}
          nodeRef={nodeRef}
          timeout={500}
          classNames="activity"
          in={enteringActivities.has(activityKey) || !exitingActivities.has(activityKey)}
        >
          {content}
        </CSSTransition>
      );
    }

    return content;
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden select-none">
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

      {/* Main Content */}
      <div className={`relative z-10 flex flex-col items-center max-w-xl w-full p-6 bg-black/20 rounded-2xl backdrop-blur-sm border-2 border-white/5 transition-opacity duration-700 transition-max-height duration-500 ease-in-out overflow-hidden ${isContentLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <div className="mb-6 w-full">
          {/* Username */}
          <h1 className="text-4xl font-semibold text-white glowing-text text-center mb-2">mnty</h1>
          <h2 className="text-xl glowing-text text-white/80 text-center mb-4">
            Discord Username: {lanyardData?.discord_user?.username || 'culx'}
          </h2>

          {/* Avatar */}
          <div className="relative flex justify-center mb-4">
            <div className="relative">
              {lanyardData?.discord_user?.avatar ? (
                <Image
                  src={`https://cdn.discordapp.com/avatars/${discordId}/${lanyardData.discord_user.avatar}.png?size=128`}
                  alt="Avatar"
                  width={100}
                  height={100}
                  draggable={false}
                  className={`rounded-full border-2 ${borderColor} transition-opacity duration-500 ${
                    isAvatarLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                  onLoad={handleAvatarLoad}
                  onError={() => setIsAvatarLoading(false)}
                  placeholder="empty"
                />
              ) : (
                <div
                  className={`rounded-full border-2 ${borderColor} w-[100px] h-[100px] bg-gray-200 flex items-center justify-center text-gray-500 text-xs`}
                >
                  {/* Placeholder */}
                </div>
              )}
              {isAvatarLoading && lanyardData?.discord_user?.avatar && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-t-transparent border-gray-400 rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* Cloud-shaped Status (Separate from PFP) */}
          <div className="flex justify-center mb-4">
            {lanyardData ? (
              <div className="cloud-box px-4 py-1 text-white/80">
                <p className="text-xs font-medium text-white glowing-text capitalize">
                  {getCustomStatus()}
                </p>
              </div>
            ) : (
              <div className="cloud-box px-4 py-1 text-white/80 animate-pulse">
                <div className="w-20 h-4 bg-gray-600 rounded"></div>
              </div>
            )}
          </div>

          {/* Activity Boxes */}
          {lanyardData ? (
            <div className="mt-2 space-y-4">
              {activitiesToRender.map((activity) => {
                const shouldAnimate = enteringActivities.has(activity.key) || exitingActivities.has(activity.key);
                return (
                  <ActivityBox
                    key={activity.key}
                    activity={activity}
                    shouldAnimate={shouldAnimate}
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-2 space-y-4">
              {/* Skeleton for Activity Boxes */}
              {[1, 2].map((_, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-4 p-4 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 shadow-lg animate-pulse"
                >
                  <div className="w-[48px] h-[48px] bg-gray-600 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="w-3/4 h-4 bg-gray-600 rounded"></div>
                    <div className="w-1/2 h-3 bg-gray-600 rounded"></div>
                  </div>
                  <div className="w-16 h-6 bg-gray-600 rounded-full"></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Now Playing Section */}
        <div className="flex mb-6 items-center space-x-4 p-4 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 shadow-lg">
          <Image
            src="https://i.snipp.gg/924822581117337691/69b1f07461b3ed00de93cf1b1a535651.jpg"
            alt="Bubblegum Album Cover"
            width={100}
            height={100}
            draggable="false"
            className="rounded-xl border-2 border-black/40"
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
            className={`p-2 rounded-full hover:scale-105 transition-all duration-200 ease-in-out glowing-icon ${
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
            className={`absolute flex items-center bg-black/40 backdrop-blur-md rounded-full px-4 py-2 transition-all duration-200 ease-in-out transform ${
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
          box-shadow: 0 0 12px rgba(255, 255, 252, 0.7);
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
        .cloud-box {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        .cloud-box::before,
        .cloud-box::after {
          content: '';
          position: absolute;
          background: inherit;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .cloud-box::before {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          top: -10px;
          left: 10px;
        }
        .cloud-box::after {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          bottom: -8px;
          right: 10px;
        }
        .activity-box {
          backdrop-filter: blur(10px);
          transform-origin: left center; /* Set transform origin for rotation */
        }
        /* Slide-in-from-left with Rotation Animation for Activities */
        .activity-enter {
          opacity: 0;
          transform: translateX(-50px) rotate(-10deg);
        }
        .activity-enter-active {
          opacity: 1;
          transform: translateX(0) rotate(0deg);
          transition: opacity 500ms ease-out,
                      transform 500ms ease-out;
        }
        .activity-exit {
          opacity: 1;
          transform: translateX(0) rotate(0deg);
        }
        .activity-exit-active {
          opacity: 0;
          transform: translateX(-50px) rotate(-10deg);
          transition: opacity 500ms ease-out,
                      transform 500ms ease-out;
        }
        /* Container Height Animation */
        .relative {
          max-height: 1000px; /* Large enough to accommodate content */
          transition: max-height 500ms ease-in-out;
        }
        /* Ensure the container shrinks when content is removed */
        .relative:has(.activity-exit-active) {
          max-height: 500px; /* Adjust based on content size; this is an estimate */
        }
      `}</style>
    </div>
  );
}