import { FetchProxyMessage, FetchProxyResponse, ExtensionMessage } from './types';

/**
 * Send a message to the background service worker and wait for response.
 */
function sendMessage<T>(message: ExtensionMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!chrome.runtime?.id) {
      // Extension was reloaded — this content script is stale
      reject(new Error('Extension context invalidated. Refresh the page.'));
      return;
    }
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response as T);
      }
    });
  });
}

/**
 * Get the persistent install ID from the service worker.
 */
export async function getInstallId(): Promise<string> {
  return sendMessage<string>({ type: 'GET_INSTALL_ID' });
}

/**
 * Proxy a fetch request through the background service worker (avoids CORS).
 */
export async function apiFetch(
  url: string,
  method: string = 'GET',
  body?: any,
  extraHeaders?: Record<string, string>
): Promise<FetchProxyResponse> {
  const installId = await getInstallId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Install-Id': installId,
    ...extraHeaders,
  };

  const message: FetchProxyMessage = {
    type: 'FETCH_PROXY',
    url,
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  return sendMessage<FetchProxyResponse>(message);
}

/**
 * Set the extension badge text.
 */
export async function setBadge(text: string, color?: string): Promise<void> {
  await sendMessage({ type: 'SET_BADGE', text, color });
}
