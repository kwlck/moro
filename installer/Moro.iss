#ifndef AppVersion
  #define AppVersion "0.1.12"
#endif

[Setup]
AppId={{A5CA9362-D433-4A01-9C38-5B0B4716E825}
AppName=Moro — YouTube PiP
AppVersion={#AppVersion}
AppPublisher=Moro
AppPublisherURL=https://github.com/kwlck/moro
AppSupportURL=https://github.com/kwlck/moro/issues
AppUpdatesURL=https://github.com/kwlck/moro/releases
DefaultDirName={localappdata}\Programs\Moro YouTube PiP
DefaultGroupName=Moro YouTube PiP
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=yes
WizardStyle=modern
SetupIconFile=..\assets\moro.ico
UninstallDisplayIcon={app}\Moro.exe
OutputDir=..\dist\installer
OutputBaseFilename=Moro-{#AppVersion}-Setup
Compression=lzma2/fast
SolidCompression=yes
CloseApplications=yes
RestartApplications=no
Uninstallable=yes
SetupLogging=yes
VersionInfoProductName=Moro — YouTube PiP
VersionInfoDescription=Moro YouTube PiP installer

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; Flags: checkedonce

[Files]
Source: "..\dist\Moro-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Moro YouTube PiP"; Filename: "{app}\Moro.exe"; Parameters: "--show-launcher"; Comment: "Hold Ctrl over the video to use controls"
Name: "{autodesktop}\Moro YouTube PiP"; Filename: "{app}\Moro.exe"; Parameters: "--show-launcher"; Tasks: desktopicon; Comment: "Hold Ctrl over the video to use controls"

[Run]
Filename: "{app}\Moro.exe"; Parameters: "--show-launcher"; Description: "Launch Moro — YouTube PiP"; Flags: nowait postinstall skipifsilent

[Messages]
FinishedHeadingLabel=Moro is ready
FinishedLabel=Paste a YouTube link to get started.%n%nHold Ctrl while hovering over the video to show controls, change settings, or move the window.%n%nUse the system tray icon to add another video or quit Moro.
