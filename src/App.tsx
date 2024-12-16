import { useState } from "react";
import { WebRTCProvider } from "./contexts/WebRTCProvider";
import { useWebRTC } from "./hooks/useWebRTC";
import "./App.css";

function VideoCall() {
  const { startCall, userId, connectionState, logs, setLogs, getIceState } =
    useWebRTC();
  const [idInput, setIdInput] = useState<string>("");

  return (
    <div>
      <p>user socket id: {userId}</p>
      <p>connection state: {connectionState}</p>
      <ul>
        {logs.map((log, index) => (
          <li style={{ color: "lime" }} key={index}>
            {log}
          </li>
        ))}
      </ul>
      <input onChange={(e) => setIdInput(e.target.value)} value={idInput} />
      <button
        onClick={async () => {
          await startCall(idInput);
        }}
      >
        Video on
      </button>
      <button onClick={() => setLogs((x) => [...x, getIceState()])}>
        Ice connection state
      </button>
    </div>
  );
}

function App() {
  return (
    <WebRTCProvider signalingServer="ws://localhost:8080/ws">
      <VideoCall />
    </WebRTCProvider>
  );
}

export default App;
