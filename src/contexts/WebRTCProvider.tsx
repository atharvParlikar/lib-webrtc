import React, { createContext, useContext, useEffect, useRef } from "react";

type WebRTCContextType = {
  peerConnection: React.MutableRefObject<RTCPeerConnection>;
  signalingChannel: React.MutableRefObject<WebSocket | null>;
};

type WebRTCProviderProps = {
  signalingServer: string;
  children: React.ReactNode;
};

const WebRTCContext = createContext<WebRTCContextType>(null!);

export const WebRTCProvider = ({
  signalingServer,
  children,
}: WebRTCProviderProps) => {
  const peerConnection = useRef(new RTCPeerConnection());
  const signalingChannel = useRef<WebSocket | null>(null);

  useEffect(() => {
    signalingChannel.current = new WebSocket(signalingServer);
    return () => signalingChannel.current?.close();
  }, [signalingServer]);

  return (
    <WebRTCContext.Provider value={{ peerConnection, signalingChannel }}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTCContext = () => useContext(WebRTCContext);
