const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('projectHubDesktop', {
  isDesktopApp: true,
  platform: process.platform,
});
