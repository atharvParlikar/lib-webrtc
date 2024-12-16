import React, { createContext, useContext, useRef, useEffect } from "react";

interface WebRTCContextType {
  signalingChannel: React.MutableRefObject<WebSocket | null>;
}

const WebRTCContext = createContext<WebRTCContextType>({
  signalingChannel: { current: null },
});

export function WebRTCProvider({
  children,
  signalingServer = "ws://localhost:8080/ws",
}: {
  children: React.ReactNode;
  signalingServer?: string;
}) {
  const signalingChannel = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!signalingChannel.current) {
      signalingChannel.current = new WebSocket(signalingServer);
    }
  }, [signalingChannel, signalingServer]);

  return (
    <WebRTCContext.Provider
      value={{
        signalingChannel,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
}

export const useWebRTCContext = () => useContext(WebRTCContext);
