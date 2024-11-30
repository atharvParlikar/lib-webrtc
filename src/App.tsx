import React from "react";
import { WebRTCProvider } from "./contexts/WebRTCProvider";
import { VideoChat } from "./VideoChat";

function App() {
  return (
    <WebRTCProvider
      roomId="my-awesome-room"
      peerId="Atharv"
      signalingServer="ws://localhost:8080"
    >
      <VideoChat />
    </WebRTCProvider>
  );
}

export default App;
