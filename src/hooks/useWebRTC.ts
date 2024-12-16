import { useEffect, useRef, useState } from "react";
import { useWebRTCContext } from "../contexts/WebRTCProvider";

// Configuration constants
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.stunprotocol.org" },
    { urls: "stun:stun.dienst.ist:3478" },
  ],
};

// Types
interface SignalPacketSdp {
  userId: string;
  signalType: "offer" | "answer";
  sdp_base64: string; // sdp is base64 encoded to avoid any json parsing issues
}

interface SignalPacketCandidate {
  userId: string;
  signalType: "candidate";
  candidate: string;
}

interface MediaConfiguration {
  video?: boolean;
  audio?: boolean;
}

// Utility functions
function sendSignalPacket(
  signalPacket: SignalPacketSdp | SignalPacketCandidate,
  signalChannel: WebSocket,
): void {
  console.log("Sending signal packet:", signalPacket);
  signalChannel.send(JSON.stringify(signalPacket));
}

export function useWebRTC() {
  const { signalingChannel } = useWebRTCContext();
  const connectionId = useRef<string | null>(null);
  const peerConnection = useRef<RTCPeerConnection>(
    new RTCPeerConnection(RTC_CONFIG),
  );
  const [logs, setLogs] = useState<string[]>([]);

  const [connectionState, setConnectionState] =
    useState<RTCPeerConnectionState>(peerConnection.current.connectionState);
  const [userId, setUserId] = useState<string>("");
  const dataChannel = useRef<RTCDataChannel | null>(null);

  // Track ICE connection state
  useEffect(() => {
    const handleIceStateChange = () => {
      console.log(
        "ICE connection state:",
        peerConnection.current.iceConnectionState,
      );
    };

    peerConnection.current.oniceconnectionstatechange = handleIceStateChange;
  }, []);

  // Handle incoming signaling messages
  const handleIncomingMessage = async (
    message: MessageEvent<string>,
  ): Promise<void> => {
    try {
      const messageObj = parseSignalPacket(message.data);

      switch (messageObj.signalType) {
        case "offer":
          await handleIncomingOffer(messageObj);
          break;
        case "answer":
          await handleIncomingAnswer(messageObj);
          break;
        case "candidate":
          await handleIncomingCandidate(messageObj);
          break;
      }
    } catch (error) {
      console.error("Failed to process signal message:", error);
    }
  };

  // Parse incoming signal packet
  const parseSignalPacket = (
    messageData: string,
  ): SignalPacketSdp | SignalPacketCandidate => {
    return JSON.parse(messageData);
  };

  const handleIncomingOffer = async (
    messageObj: SignalPacketSdp,
  ): Promise<void> => {
    setLogs((x) => [...x, "Received offer"]);
    await peerConnection.current.setRemoteDescription({
      type: "offer",
      sdp: atob(messageObj.sdp_base64), // decode base64 encoded sdp
    });

    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    if (signalingChannel.current) {
      sendSignalPacket(
        {
          signalType: "answer",
          userId: messageObj.userId,
          sdp_base64: btoa(answer.sdp!), // encoding sdp in base64 to avoid json parsing issues.
        },
        signalingChannel.current,
      );
    }
  };

  const handleIncomingAnswer = async (
    messageObj: SignalPacketSdp,
  ): Promise<void> => {
    setLogs((x) => [...x, "Recieved answer"]);
    await peerConnection.current.setRemoteDescription({
      type: "answer",
      sdp: atob(messageObj.sdp_base64),
    });
  };

  const handleIncomingCandidate = async (
    messageObj: SignalPacketCandidate,
  ): Promise<void> => {
    try {
      const { candidate } = messageObj;
      const candidateJson = JSON.parse(candidate);

      // Only add if remote description is set
      if (peerConnection.current.remoteDescription) {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidateJson),
        );
        console.log("Ice candidate added successfully");
        setLogs((x) => [...x, "Ice candidate added successfully"]);
      } else {
        console.warn("Remote description not set. Candidate cannot be added.");
      }
    } catch (error) {
      console.error("Failed to add ICE candidate:", error);
    }
  };

  // Start a call
  const startCall = async (
    userId: string,
    configuration: MediaConfiguration = { video: true, audio: true },
  ): Promise<null> => {
    // TODO: This should return media stream but because I dont like to look at my face while coding I have set it to null, fix this later
    if (!signalingChannel.current) {
      throw new Error("Signaling channel is not active!");
    }

    // const localStream =
    //   await navigator.mediaDevices.getUserMedia(configuration);

    dataChannel.current = peerConnection.current.createDataChannel("channel");

    dataChannel.current.onopen = () => console.log("data channel opened!!!");
    dataChannel.current.onclose = () => console.log("data channel closed!!!");

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    const signalPacket = {
      userId,
      signalType: "offer",
      sdp_base64: btoa(offer.sdp!), // encode sdp to base64 to avoid json parsing issues
    };

    sendSignalPacket(signalPacket as SignalPacketSdp, signalingChannel.current);
    return null;
  };

  // Set up signaling channel listeners
  useEffect(() => {
    if (!signalingChannel.current) return;

    const handleOpen = () => console.log("Connection is open");
    const handleClose = () => console.log("Connection is closed");

    const handleMessage = (message: MessageEvent<string>) => {
      if (connectionId.current === null) {
        try {
          const parsedMessage = JSON.parse(message.data);
          setUserId(parsedMessage.userId);
          connectionId.current = parsedMessage.userId;
          console.log("Received connection ID:", connectionId.current);
        } catch (error) {
          console.error("Failed to parse initial user ID:", error);
        }
      } else {
        handleIncomingMessage(message);
      }
    };

    signalingChannel.current.onopen = handleOpen;
    signalingChannel.current.onclose = handleClose;
    signalingChannel.current.onmessage = handleMessage;
  }, [signalingChannel]);

  useEffect(() => {
    if (signalingChannel.current && userId && peerConnection.current) {
      console.log("got here");
      peerConnection.current.onconnectionstatechange = () => {
        setConnectionState(peerConnection.current.connectionState);
      };

      peerConnection.current.onicegatheringstatechange = () => {
        console.log("ice candidate gathering state canged");
        setLogs((x) => [
          ...x,
          "ice candidate gathering state canged: " +
            peerConnection.current.iceConnectionState,
        ]);
      };

      peerConnection.current.onicecandidate = (event) => {
        console.log("Ice candidate generation triggered");
        if (event.candidate) {
          console.log("Got ice candidate: ", event.candidate);
          setLogs((x) => [...x, "Got ice candidate"]);
          console.log("candidate: ", event.candidate);
          sendSignalPacket(
            {
              signalType: "candidate",
              candidate: JSON.stringify(event.candidate.toJSON()),
              userId,
            },
            signalingChannel.current!,
          );
        } else {
          setLogs((x) => [...x, "ice candidate gathering complete"]);
        }
      };

      peerConnection.current.onicecandidateerror = (event) => {
        console.error("ICE candidate error:", event.errorText);
      };
    }
  }, [signalingChannel, userId]);

  // End call (placeholder implementation)
  const endCall = () => {
    // TODO: Implement proper call termination
    return null;
  };

  return {
    startCall,
    endCall,
    signalingChannel,
    connectionState,
    userId,
    logs,
    setLogs,
    getIceState: () =>
      "current ice connection state: " +
      peerConnection.current.iceConnectionState,
  };
}
