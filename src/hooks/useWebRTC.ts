import { useEffect, useRef, useState } from "react";
import { useWebRTCContext } from "../contexts/WebRTCProvider";

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useWebRTC() {
  const { peerConnection, signalingChannel } = useWebRTCContext();
  const [candidates, setCandidates] = useState<RTCIceCandidate[]>([]);

  const isGathering = useRef<boolean>(true);

  useEffect(() => {
    const createPeerConnection = async () => {
      const pc = new RTCPeerConnection(configuration);
      peerConnection.current = pc;

      pc.onicecandidate = (event) => {
        console.log("ICE candidate:", event.candidate);
        if (event.candidate) {
          setCandidates((prev) => [...prev, event.candidate!]);
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log("ICE gathering state:", pc.iceGatheringState);
        if (pc.iceGatheringState === "complete") {
          isGathering.current = false;
        }
      };

      const channel = pc.createDataChannel("test");
      channel.onopen = () => console.log("Data channel opened");

      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    };

    createPeerConnection();

    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, []);
}
