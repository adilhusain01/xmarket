// Tweet context display component

import React from 'react';

interface TweetContextProps {
  tweetId: string;
  text: string;
  author?: string;
  authorHandle?: string;
}

export function TweetContext({ text, author, authorHandle }: TweetContextProps) {
  return (
    <div className="tweet-context">
      {author && (
        <div className="tweet-author">
          {author} {authorHandle && <span style={{ color: '#536471' }}>@{authorHandle}</span>}
        </div>
      )}
      <div className="tweet-text">{text}</div>
    </div>
  );
}
