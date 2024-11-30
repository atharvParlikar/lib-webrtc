import React from "react";

interface VideoPlayerProps {
  stream: MediaStream;
  label?: string;
}

export function VideoPlayer({ stream, label }: VideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-container">
      {label && <p>{label}</p>}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={label === "Local Video"}
        className="video-element"
      />
    </div>
  );
}
