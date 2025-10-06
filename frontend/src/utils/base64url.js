export const b64u = {
  enc: (bytes) =>
    btoa(String.fromCharCode(...bytes))
      .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),
  dec: (s) =>
    new Uint8Array(atob(s.replace(/-/g,'+').replace(/_/g,'/'))
      .split('').map(c => c.charCodeAt(0))),
};
