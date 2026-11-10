import { io, type Socket } from "socket.io-client";
import { AUTH_API_BASE_URL } from "@/lib/authClient";
import { useAuthStore } from "@/store/authStore";

// AUTH_API_BASE_URL already ends in "/api" (e.g. http://localhost:5000/api) — Socket.IO
// connects to the bare server origin, not the REST path.
const SOCKET_URL = AUTH_API_BASE_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

/** Lazily creates one shared, authenticated socket for the whole app. Re-reads the
 * current access token on (re)connect so a token refresh is picked up automatically. */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    // socket.io-client's function form of `auth` is callback-style, not a plain return —
    // it calls this with a `cb` argument and waits for `cb(...)` before ever sending the
    // connect packet. Returning a value instead of calling `cb` leaves the handshake
    // hanging forever: the transport opens, but the socket never actually connects.
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
  });
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
