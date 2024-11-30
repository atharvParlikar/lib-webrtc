import React, { useState } from "react";
import { useWebRTC } from "./hooks/useWebRTC";
import { useWebRTCContext } from "./contexts/WebRTCProvider";
import { VideoPlayer } from "./VideoPlayer";

export function VideoChat() {
  const { roomId, peerId } = useWebRTCContext();
  const { localStream, remoteStreams, startCall, endCall, isConnected } =
    useWebRTC(roomId, peerId);

  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);

  const handleStartCall = () => {
    // If you want to initiate a call with a specific peer
    if (remoteStreams.size > 0) {
      const firstPeerId = Array.from(remoteStreams.keys())[0];
      startCall(firstPeerId);
    }
  };

  return (
    <div className="video-chat-container">
      <h1>Video Chat - Room: {roomId}</h1>

      <div className="video-grid">
        {/* Local Video */}
        {localStream && <VideoPlayer stream={localStream} label="Your Video" />}

        {/* Remote Videos */}
        {Array.from(remoteStreams).map(([peerId, stream]) => (
          <VideoPlayer key={peerId} stream={stream} label={`Peer: ${peerId}`} />
        ))}
      </div>

      <div className="call-controls">
        {!isConnected ? (
          <button onClick={handleStartCall} disabled={remoteStreams.size === 0}>
            Start Call
          </button>
        ) : (
          <button onClick={endCall}>End Call</button>
        )}
      </div>

      {/* Optional: Peer Selection */}
      {remoteStreams.size > 0 && (
        <div className="peer-list">
          <h2>Available Peers</h2>
          {Array.from(remoteStreams.keys()).map((id) => (
            <button
              key={id}
              onClick={() => {
                setSelectedPeer(id);
                startCall(id);
              }}
            >
              Call Peer {id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
