import { toast, Bounce } from 'react-toastify';

let notificationSound: HTMLAudioElement | null = null;

const getNotificationSound = () => {
  if (typeof window !== 'undefined' && !notificationSound) {
    notificationSound = new Audio('/audio/notification.wav');
    notificationSound.volume = 1;
  }
  return notificationSound;
};

const Session = {
  setCookie: (cname: string, cvalue: string) => {
    const d = new Date();
    if (cvalue === '') d.setTime(d.getTime() - (360 * 24 * 60 * 60 * 1000));
    else d.setTime(d.getTime() + (14 * 60 * 60 * 1000));
    let expires = 'expires=' + d.toUTCString();
    document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/;SameSite=Strict;secure;';
  },

  getCookie: (cname: string) => {
    try {
      let name = cname + '=';
      let decodedCookie = decodeURIComponent(document.cookie || '');
      let ca = decodedCookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        if (!c || typeof c !== 'string') continue;
        while (c.charAt(0) === ' ') {
          c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
          return c.substring(name.length, c.length);
        }
      }
      return '';
    } catch (error) {
      console.warn('Error in getCookie:', error);
      return '';
    }
  },

  clearAllCookies: () => {
    try {
      const cookies = (document.cookie || '').split(";");

      for (let cookie of cookies) {
        if (!cookie || typeof cookie !== 'string') continue;
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    } catch (error) {
      console.warn('Error in clearAllCookies:', error);
    }
  },

  get: (key: string) => {
    const val = localStorage.getItem(key) || '';
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch (e) {
      return null;
    }
  },

  set: (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  },

  saveAlert: ({ str, type = 'default' }: { str?: string, type?: 'info' | 'success' | 'warning' | 'error' | 'default' }) => {
    let item = localStorage.getItem('alerts');
    let obj: Record<string, any> = {};
    if (item) {
      obj = JSON.parse(item);
    }
    if (!obj[type]) obj[type] = [];
    obj[type].push(str);
    localStorage.setItem('alerts', JSON.stringify(obj));
  },

  countAlert: () => {
    const items = localStorage.getItem('alerts');
    if (!items) {
      return 0;
    }
    const obj = JSON.parse(items);
    return Object.keys(obj).length;
  },

  remove: (key: string) => {
    localStorage.removeItem(key);
  },

  removeAll: () => {
    localStorage.clear();
  },

  removeAllExcept: (key: string) => {
    const preservedValue = localStorage.getItem(key);
    localStorage.clear();
    if (preservedValue !== null) {
      localStorage.setItem(key, preservedValue);
    }
  },

  showAlert: ({ str, type = 'default' }: { str?: string, type?: 'info' | 'success' | 'warning' | 'error' | 'default' }) => {
    let item = localStorage.getItem('alerts');
    localStorage.removeItem('alerts');
    let obj: Record<string, any> = {};
    if (item) {
      obj = JSON.parse(item);
    }
    if (str && str.trim()) {
      if (!obj[type]) obj[type] = [];
      obj[type].push(str);
    }
    const showTheToast: Record<string, any> = {
      info: toast.info,
      success: toast.success,
      warning: toast.warning,
      error: toast.error,
      default: toast
    }
    Object.keys(obj).forEach((color: string) => {
      if (obj[color].length > 0) {
        obj[color].forEach((element: string) => {
          showTheToast[color](element, {
            position: "top-right",
            autoClose: 10000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
            transition: Bounce,
            style: {
              backgroundColor: '#171717',
              color: '#e5e5e5',
              border: '1px solid #404040'
            },
            progressStyle: {
              backgroundColor: '#a3a3a3'
            }
          });

          const sound = getNotificationSound();
          if (sound) sound.play();
        })
      }
    })
  },
};

export default Session;
