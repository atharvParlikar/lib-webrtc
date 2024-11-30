import React, { createContext, useContext, useRef, useEffect } from "react";

interface WebRTCContextType {
  signalingChannel: React.MutableRefObject<WebSocket | null>;
  peerId: string;
  roomId: string;
}

const WebRTCContext = createContext<WebRTCContextType>({
  signalingChannel: { current: null },
  peerId: "",
  roomId: "",
});

export function WebRTCProvider({
  children,
  signalingServer = "ws://localhost:8080",
  roomId,
  peerId,
}: {
  children: React.ReactNode;
  signalingServer?: string;
  roomId: string;
  peerId: string;
}) {
  const signalingChannel = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Establish WebSocket connection
    signalingChannel.current = new WebSocket(signalingServer);

    signalingChannel.current.onopen = () => {
      console.log("Signaling channel opened");
    };

    signalingChannel.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    signalingChannel.current.onclose = () => {
      console.log("Signaling channel closed");
    };

    return () => {
      if (signalingChannel.current) {
        signalingChannel.current.close();
      }
    };
  }, [signalingServer]);

  return (
    <WebRTCContext.Provider
      value={{
        signalingChannel,
        peerId,
        roomId,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
}

export function useWebRTCContext() {
  return useContext(WebRTCContext);
}
