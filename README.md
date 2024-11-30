# Icebreaker

A simple and intuitive WebRTC library for building video call applications in React. Icebreaker abstracts the complexities of WebRTC and provides an easy-to-use API for integrating real-time video and audio communication into your React applications.

## Features

- **Simple WebRTC API**: Provides a simple React context and hooks to manage WebRTC peer connections and signaling channels.
- **Room-based system**: Manage multiple video rooms with simple integration.
- **Customizable**: Easily extend and customize WebRTC behavior using your own signaling server.
- **Cross-Platform**: Compatible with all modern browsers that support WebRTC.

## Installation

You can install Icebreaker via npm or yarn.

### With npm:

```bash
npm install icebreaker
```

### With yarn:

```bash
yarn add icebreaker
```

## Usage

### 1. Setting up the WebRTC Context Provider

The `WebRTCProvider` component is the main entry point for initializing a WebRTC connection. It takes the signaling server URL and room ID as props and wraps your app in a context that provides access to the WebRTC peer connection and signaling channel.

```javascript
import React from "react";
import { WebRTCProvider } from "icebreaker";
import VideoCall from "./VideoCall";

function App() {
  return (
    <WebRTCProvider signalingServer="ws://localhost:8080" roomId="123">
      <VideoCall />
    </WebRTCProvider>
  );
}

export default App;
```

### 2. Using WebRTC in Your Components

Once the `WebRTCProvider` is set up, you can use the `useWebRTCContext` hook to access the WebRTC peer connection and signaling channel within any component.

```javascript
import React, { useEffect } from "react";
import { useWebRTCContext } from "icebreaker";

const VideoCall = () => {
  const { peerConnection, signalingChannel } = useWebRTCContext();

  useEffect(() => {
    signalingChannel.current?.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "signal") {
        peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(message.sdp),
        );
      }
    };

    return () => {
      peerConnection.current.close();
    };
  }, [signalingChannel, peerConnection]);

  return (
    <div>
      <video
        ref={(ref) =>
          ref && (ref.srcObject = peerConnection.current?.getRemoteStreams()[0])
        }
        autoPlay
      />
      <video
        ref={(ref) =>
          ref && (ref.srcObject = peerConnection.current?.getLocalStreams()[0])
        }
        autoPlay
      />
    </div>
  );
};

export default VideoCall;
```

## API

### WebRTCProvider

**Props**:

- `signalingServer` (string): The URL of the WebSocket signaling server.
- `roomId` (string): The ID of the room to join. This is used for room-based communication.

---

### useWebRTCContext

A hook to access the WebRTC context.

**Returns**:

- `peerConnection` (`React.MutableRefObject`): The WebRTC `RTCPeerConnection` instance.
- `signalingChannel` (`React.MutableRefObject<WebSocket | null>`): The WebSocket signaling channel used for communication.

---

## Example with Custom Signaling

You can use your own WebSocket signaling server to facilitate communication between peers. Here’s an example of how you might send a signaling message from the client to the server.

```javascript
import React, { useEffect } from "react";
import { useWebRTCContext } from "icebreaker";

const CustomSignalComponent = () => {
  const { signalingChannel, peerConnection } = useWebRTCContext();

  useEffect(() => {
    const sendSignal = (to, signalData) => {
      signalingChannel.current?.send(
        JSON.stringify({ type: "signal", to, ...signalData }),
      );
    };

    sendSignal("peerId", {
      sdp: "sdp-offer-here",
    });

    return () => {
      peerConnection.current.close();
    };
  }, [signalingChannel, peerConnection]);

  return <div>Sending custom signal...</div>;
};

export default CustomSignalComponent;
```

## Contributing

We welcome contributions! If you find a bug or have an idea for a new feature, feel free to open an issue or submit a pull request.

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-xyz
   ```
3. Commit your changes:
   ```bash
   git commit -am 'Add feature xyz'
   ```
4. Push to the branch:
   ```bash
   git push origin feature-xyz
   ```
5. Open a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
