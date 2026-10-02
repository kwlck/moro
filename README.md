# Moro — YouTube PiP

A compact floating YouTube player for Windows, with rounded corners, tinted glass controls, a liquid Gooey menu, and magnetic window snapping.

**Hold Ctrl over the video to reveal controls and interact with the window.** Release Ctrl to click through to the application underneath.

## Download

### Easy installation

1. Download **[Moro-0.1.10-Setup.exe](https://github.com/kwlck/moro/releases/download/v0.1.10/Moro-0.1.10-Setup.exe)** for Windows 10/11 x64.
2. Open it and click **Install**. It installs for your user and creates a Start menu shortcut; a desktop shortcut is selected by default. No administrator rights, Node.js, or extra runtime installation is required.
3. Leave **Launch Moro — YouTube PiP** selected, click **Finish**, and paste a YouTube link into the compact form.

To reopen link entry, use the **Moro YouTube PiP** shortcut or click its system tray icon. Uninstall from Windows **Settings → Apps**. No automatic startup is added.

### Portable version

The [latest release](https://github.com/kwlck/moro/releases/latest) also includes a Windows x64 ZIP. Extract the **entire folder** and run `Moro.exe`. Keep its supporting files beside it. The portable app starts in the system tray; click its icon to paste a link.

## Screenshots

These are actual app captures of [Color Burst HDR Dolby Vision™ 12K 60FPS](https://www.youtube.com/watch?v=y9n6HkftavM), with **Tint at 20% and Blur at 4 px** (both sliders at minimum). The underlying video resolutions were checked before capture. Each image contains only the player window.

![Compact Moro window at 0:13 in 480p with controls visible](docs/01-compact-480p-ctrl.png)

![Large Moro window at 6:41 in 1080p with controls visible](docs/02-large-1080p-ctrl.png)

![Large Moro window at 7:44 in 1080p with controls hidden](docs/03-large-1080p-clean.png)

## Use

1. Click the Moro tray icon, paste a YouTube video link, and press Enter. You can also try the included demo.
2. Hold **Ctrl** while the pointer is over the video to reveal controls and interact with it. Drag any free video area while holding Ctrl to move the window.
3. Release Ctrl to pass clicks through to the application underneath. Ordinary hover fades the video without revealing controls.
4. Open **…** for the Gooey menu: link entry, video quality/audio, and window appearance.
5. Adjust **Hover fade** in Window settings. `0%` keeps the usual opacity; `90%` makes the video nearly transparent on ordinary hover. Holding Ctrl restores the usual opacity.
6. Use the top-right close button or tray menu to hide the video. Quit Moro from the tray to exit the application.

The size slider changes the video smoothly while you drag. Its panel stays fixed under the pointer during resizing.

Window settings also include tint, blur, size, corner radius, opacity, snapping distance, animation speed, bounce, and Gooey strength. Settings are saved locally.

## Build from source

Requirements: Windows x64, Node.js 22.12 or newer with npm, and the Windows .NET Framework C# compiler. The build script uses the compiler under `%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe`.

```powershell
npm ci
npm test
npm start
```

Package the portable application:

```powershell
npm run package
```

The output is `dist/Moro-win32-x64/`. The native motion helper is compiled from `native/MoroMotion.cs` and unpacked beside Electron's application archive.

To build the installer, install [Inno Setup](https://jrsoftware.org/isdl.php) 6.7 or newer and run:

```powershell
npm run installer
```

The installer is written to `dist/installer/`. With a compiler in another location, first run `npm run package`, then run `tools/build-installer.ps1 -CompilerPath <path-to-ISCC.exe>` from PowerShell.

The checked-in UI is ready to use. After editing `ui/overlay.html`, regenerate its trusted DOM tree with Python 3:

```powershell
npm run build:ui
```

## Verification

```powershell
npm test
npm run smoke
```

The smoke check exercises demo playback, controls, menus, window settings, native hit testing, click-through behavior, and desktop visibility protection. Reports stay in the ignored `outputs/` directory. An optional `--youtube-probe` checks the public sample video from YouTube's [IFrame API documentation](https://developers.google.com/youtube/iframe_api_reference); it requires a network connection and a playable YouTube embed. An optional `--native-drag` check moves the pointer and window on the test machine.

## Playback and platform limits

Moro loads YouTube embeds and provides custom controls. Available qualities and audio tracks are supplied by YouTube. Restricted or embedding-disabled videos may not play, and changes to YouTube's player internals may affect quality/audio switching. This is an independent application; it is not affiliated with Apple or YouTube.

The application uses native Windows dragging and a compositor-paced motion helper. It stays above ordinary desktop windows and restores system hiding/minimization while the video is intentionally visible. Exclusive fullscreen applications, the Windows secure desktop, and other special system surfaces can still cover it.

The installer and portable release are unsigned.

## Privacy and security

No API key or developer credential is required. Moro does not include an analytics service. Playback connects to YouTube and its media services. Settings and Electron's browser/session data are kept in the current Windows user's local app-data directories; they are not part of the repository or release.

Remote pages run with `nodeIntegration: false`, context isolation, and sandboxing. IPC handlers validate the calling frame and action values. The trusted UI overlay is constructed as DOM nodes, without inserting HTML strings into the remote page.

Source publication excludes developer reports, browser data, personal links, local credentials, and development screenshots. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for icon and demo-media licenses. Project code is currently **UNLICENSED**; no general reuse license has been granted.
