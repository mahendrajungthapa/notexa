import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

let echoInstance: Echo<any> | null = null;

/**
 * Initialize Laravel Echo with Pusher for real-time features.
 * Call this once after user logs in.
 */
export function initEcho(token: string): Echo<any> {
  if (echoInstance) return echoInstance;

  // Make Pusher available globally (required by Laravel Echo)
  if (typeof window !== 'undefined') {
    (window as any).Pusher = Pusher;
  }

  echoInstance = new Echo({
    broadcaster: 'pusher',
    key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2',
    forceTLS: true,
    encrypted: true,
    authEndpoint: `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });

  return echoInstance;
}

/**
 * Get existing Echo instance.
 */
export function getEcho(): Echo<any> | null {
  return echoInstance;
}

/**
 * Disconnect and clean up Echo instance.
 */
export function disconnectEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}

/**
 * Join a note's presence channel for real-time collaboration.
 * Returns methods to handle events.
 */
export function joinNoteChannel(noteId: number, callbacks: {
  onHere?: (users: any[]) => void;
  onJoining?: (user: any) => void;
  onLeaving?: (user: any) => void;
  onUpdated?: (data: any) => void;
}) {
  const echo = getEcho();
  if (!echo) {
    console.warn('Echo not initialized. Call initEcho() first.');
    return null;
  }

  const channel = echo.join(`note.${noteId}`);

  if (callbacks.onHere) {
    channel.here(callbacks.onHere);
  }
  if (callbacks.onJoining) {
    channel.joining(callbacks.onJoining);
  }
  if (callbacks.onLeaving) {
    channel.leaving(callbacks.onLeaving);
  }
  if (callbacks.onUpdated) {
    channel.listen('.note.updated', callbacks.onUpdated);
  }

  return {
    leave: () => echo.leave(`note.${noteId}`),
    channel,
  };
}
