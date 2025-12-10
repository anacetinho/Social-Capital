import React, { useState, useEffect } from 'react';

const StreamingText = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    // Simply display the text as it comes in (no artificial delay)
    // The streaming effect comes from the SSE chunks arriving over time
    setDisplayedText(text);
  }, [text]);

  return (
    <span className="streaming-text">
      {displayedText}
      <span className="streaming-cursor">▊</span>
    </span>
  );
};

export default StreamingText;
