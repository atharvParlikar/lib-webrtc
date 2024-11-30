import { useEffect, useRef, useState } from "react";
import { useWebRTCContext } from "../contexts/WebRTCProvider";

const configuration: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useWebRTC(roomId: string, peerId: string) {
  const { signalingChannel } = useWebRTCContext();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );
  const [isConnected, setIsConnected] = useState(false);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Join the room when the hook is first used
  useEffect(() => {
    if (signalingChannel.current && roomId && peerId) {
      signalingChannel.current.send(
        JSON.stringify({
          type: "join",
          roomId,
          peerId,
        }),
      );
    }
  }, [roomId, peerId, signalingChannel]);

  // Handle signaling messages
  useEffect(() => {
    if (!signalingChannel.current) return;

    const handleSignalingMessage = async (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "join-success":
          await startLocalStream();
          break;

        case "peer-joined":
          await createPeerConnection(data.peerId);
          break;

        case "offer":
          await handleOffer(data);
          break;

        case "answer":
          await handleAnswer(data);
          break;

        case "ice-candidate":
          await handleIceCandidate(data);
          break;
      }
    };

    signalingChannel.current.addEventListener(
      "message",
      handleSignalingMessage,
    );

    return () => {
      if (signalingChannel.current) {
        signalingChannel.current.removeEventListener(
          "message",
          handleSignalingMessage,
        );
      }
    };
  }, [signalingChannel]);

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      setIsConnected(true);
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };

  const createPeerConnection = async (remotePeerId: string) => {
    const pc = new RTCPeerConnection(configuration);
    peerConnectionsRef.current.set(remotePeerId, pc);

    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const remoteMediaStream = event.streams[0];
      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        updated.set(remotePeerId, remoteMediaStream);
        return updated;
      });
    };

    // Gather ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalingChannel.current?.send(
          JSON.stringify({
            type: "ice-candidate",
            roomId,
            to: remotePeerId,
            from: peerId,
            candidate: event.candidate,
          }),
        );
      }
    };

    // Create and send offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      signalingChannel.current?.send(
        JSON.stringify({
          type: "offer",
          roomId,
          to: remotePeerId,
          from: peerId,
          sdp: offer.sdp,
        }),
      );
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  const handleOffer = async (data: any) => {
    const { from: remotePeerId, sdp } = data;

    let pc = peerConnectionsRef.current.get(remotePeerId);
    if (!pc) {
      pc = new RTCPeerConnection(configuration);
      peerConnectionsRef.current.set(remotePeerId, pc);

      // Add local stream tracks to peer connection
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        const remoteMediaStream = event.streams[0];
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.set(remotePeerId, remoteMediaStream);
          return updated;
        });
      };

      // Gather ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          signalingChannel.current?.send(
            JSON.stringify({
              type: "ice-candidate",
              roomId,
              to: remotePeerId,
              from: peerId,
              candidate: event.candidate,
            }),
          );
        }
      };
    }

    try {
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "offer", sdp }),
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      signalingChannel.current?.send(
        JSON.stringify({
          type: "answer",
          roomId,
          to: remotePeerId,
          from: peerId,
          sdp: answer.sdp,
        }),
      );
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  };

  const handleAnswer = async (data: any) => {
    const { from: remotePeerId, sdp } = data;
    const pc = peerConnectionsRef.current.get(remotePeerId);

    if (pc) {
      try {
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "answer", sdp }),
        );
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    }
  };

  const handleIceCandidate = async (data: any) => {
    const { from: remotePeerId, candidate } = data;
    const pc = peerConnectionsRef.current.get(remotePeerId);

    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    }
  };

  const endCall = () => {
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    // Close peer connections
    peerConnectionsRef.current.forEach((pc) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();

    // Clear remote streams
    setRemoteStreams(new Map());

    // Reset connection state
    setIsConnected(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  return {
    startCall: createPeerConnection,
    endCall,
    localStream,
    remoteStreams,
    isConnected,
  };
}
