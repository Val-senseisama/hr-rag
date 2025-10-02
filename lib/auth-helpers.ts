import { jwtDecode } from "jwt-decode";
import Session from "./session";

export const isLoggedIn = (): boolean => {
  // Check for access token in cookies using Session helper
  const token = Session.getCookie('x-access-token');

  if (!token) {
    return false;
  }

  try {
    const decoded: Record<string, any> = jwtDecode(token);
    
    // Check if token is expired
    const isExpired = decoded.exp <= Math.floor(Date.now() / 1000);
    if (isExpired || !decoded.id) {
      return false;
    }
  } catch (err) {
    return false;
  }
  
  return true;
};

export const getCookie = (name: string): string | null => {
  return Session.getCookie(name);
};
