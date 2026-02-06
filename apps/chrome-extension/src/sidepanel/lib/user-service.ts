// User verification and wallet fetching service

export interface UserVerificationResult {
  isRegistered: boolean;
  walletAddress?: `0x${string}`;
  error?: string;
}

/**
 * Verify if a Twitter user is registered and get their custodial wallet address
 * This will call your backend API to check the database
 */
export async function verifyTwitterUser(twitterHandle: string): Promise<UserVerificationResult> {
  if (!twitterHandle || twitterHandle.trim().length === 0) {
    console.log(`[UserService] ✗ No Twitter handle provided`);
    return {
      isRegistered: false,
      error: 'Unable to detect Twitter account.',
    };
  }

  console.log(`[UserService] 🔍 Verifying Twitter user: @${twitterHandle}`);

  try {
    // Use production API URL
    const apiUrl = import.meta.env.VITE_API_URL || 'https://xmarket-web.vercel.app';
    const response = await fetch(`${apiUrl}/api/user/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        twitterHandle,
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[UserService] ✗ User @${twitterHandle} not registered`);
        return {
          isRegistered: false,
          error: 'User not registered. Please visit xmarket.com to create an account.',
        };
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.walletAddress) {
      console.log(`[UserService] ✗ No wallet found for @${twitterHandle}`);
      return {
        isRegistered: false,
        error: 'No wallet linked to your account. Please complete setup at xmarket.com.',
      };
    }

    console.log(`[UserService] ✅ User verified: @${twitterHandle}`);
    console.log(`[UserService]   Wallet: ${data.walletAddress}`);

    return {
      isRegistered: true,
      walletAddress: data.walletAddress as `0x${string}`,
    };
  } catch (error) {
    console.error(`[UserService] ✗ Verification failed:`, error);
    
    return {
      isRegistered: false,
      error: 'Unable to connect to Xmarket servers. Please try again later.',
    };
  }
}

/**
 * Get the current Twitter user's handle from the page
 * This should be called from the content script context
 */
export function getCurrentTwitterHandle(): string | null {
  // Try multiple selectors to find the logged-in user's handle
  const selectors = [
    '[data-testid="SideNav_AccountSwitcher_Button"] [dir="ltr"]',
    '[data-testid="UserAvatar-Container-unknown"] + div [dir="ltr"]',
    'a[href^="/"][aria-label*="Profile"]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element?.textContent) {
      const handle = element.textContent.trim().replace('@', '');
      if (handle && handle.length > 0) {
        return handle;
      }
    }
  }

  return null;
}
