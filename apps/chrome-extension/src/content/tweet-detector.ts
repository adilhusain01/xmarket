// Tweet detection utilities for Twitter/X

import { TweetContext } from '../shared/messaging';

/**
 * Extracts tweet data from a tweet element
 * Twitter uses data-testid attributes for elements
 */
export function extractTweetData(element: HTMLElement): TweetContext | null {
  try {
    // Find tweet text
    const textElement = element.querySelector('[data-testid="tweetText"]');
    const text = textElement?.textContent || '';

    if (!text) return null;

    // Find tweet link to extract ID
    const tweetLink = element.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
    const href = tweetLink?.getAttribute('href') || '';
    const tweetIdMatch = href.match(/\/status\/(\d+)/);
    const tweetId = tweetIdMatch ? tweetIdMatch[1] : '';

    if (!tweetId) return null;

    // Extract author info
    const authorElement = element.querySelector('[data-testid="User-Name"]');
    const authorName = authorElement?.querySelector('span')?.textContent || '';

    // Extract handle from link
    const authorLink = element.querySelector('a[role="link"][href^="/"]') as HTMLAnchorElement;
    const authorHandle = authorLink?.getAttribute('href')?.replace('/', '') || '';

    return {
      tweetId,
      text,
      author: authorName,
      authorHandle,
    };
  } catch (error) {
    console.error('[Xmarket] Error extracting tweet data:', error);
    return null;
  }
}

/**
 * Finds all tweet elements on the page
 */
export function findTweetElements(): HTMLElement[] {
  const tweets = document.querySelectorAll('[data-testid="tweet"]');
  return Array.from(tweets) as HTMLElement[];
}

/**
 * Checks if an element is a valid tweet (not retweet indicator, etc.)
 */
export function isValidTweet(element: HTMLElement): boolean {
  // Skip retweet indicators and other non-tweet elements
  const article = element.closest('article');
  if (!article) return false;

  // Must have tweet text
  const hasText = !!element.querySelector('[data-testid="tweetText"]');

  // Must have status link
  const hasStatusLink = !!element.querySelector('a[href*="/status/"]');

  return hasText && hasStatusLink;
}

/**
 * Finds the tweet element containing a given node
 */
export function findParentTweet(node: Node): HTMLElement | null {
  let element = node instanceof HTMLElement ? node : node.parentElement;

  while (element) {
    if (element.getAttribute('data-testid') === 'tweet') {
      return element;
    }
    element = element.parentElement;
  }

  return null;
}

/**
 * Checks if a tweet element already has a bet button
 */
export function hasBetButton(tweetElement: HTMLElement): boolean {
  return !!tweetElement.querySelector('.xmarket-bet-button');
}

/**
 * Gets the action bar container for a tweet where we can inject the button
 */
export function getActionBar(tweetElement: HTMLElement): HTMLElement | null {
  // Twitter's action bar has reply, retweet, like, share buttons
  const actionBar = tweetElement.querySelector('[role="group"]');
  return actionBar as HTMLElement | null;
}
