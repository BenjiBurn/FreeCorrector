; The installer of FreeCorrector for Windows downloaded from lapigeonnerie.fr
; (for the PCs where the Microsoft Store is blocked): built by windows/setup.ps1
; with Inno Setup 6, from the app published with its own .NET runtime.
; It installs for the current user only, without administrator rights, into
; %LOCALAPPDATA%\Programs\FreeCorrector, with an uninstaller.
;   ISCC /DAppVersion=0.3.0 /DSourceDir=<published app> /DOutputDir=<dist> FreeCorrector.iss

#ifndef AppVersion
  #error AppVersion is missing: build with windows/setup.ps1
#endif

[Setup]
; Never change it: Windows recognises the installed app (updates, uninstall) by it.
AppId={{153A6356-C202-48C0-ADAC-ACF1437DE0DE}
AppName=FreeCorrector
AppVersion={#AppVersion}
AppVerName=FreeCorrector {#AppVersion}
AppPublisher=LaPigeonnerie
AppPublisherURL=https://lapigeonnerie.fr/freecorrector
AppSupportURL=https://github.com/BenjiBurn/FreeCorrector/issues
AppUpdatesURL=https://lapigeonnerie.fr/freecorrector/windows
AppCopyright=GPL v3 · BenjiBurn
VersionInfoVersion={#AppVersion}
VersionInfoCompany=LaPigeonnerie
VersionInfoProductName=FreeCorrector
VersionInfoDescription=FreeCorrector Setup
PrivilegesRequired=lowest
DefaultDirName={autopf}\FreeCorrector
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=yes
UsePreviousTasks=yes
; Windows 10 2004 and later, 64 bits (the app's own requirements).
MinVersion=10.0.19041
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; The app is closed by FreeCorrector.exe --quit (PrepareToInstall below).
CloseApplications=no
SetupIconFile=..\app\icon.ico
UninstallDisplayIcon={app}\FreeCorrector.exe
UninstallDisplayName=FreeCorrector
WizardStyle=modern
; French on a French Windows, English otherwise: no language question.
ShowLanguageDialog=no
Compression=lzma2/ultra64
SolidCompression=yes
OutputDir={#OutputDir}
OutputBaseFilename=freecorrector-{#AppVersion}-windows-x64-setup

[Languages]
; The first one is used when Windows' language is neither.
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Messages]
; The tasks page: what the update check sends, said before it is chosen.
french.SelectTasksLabel2=Choisissez les options de FreeCorrector, puis cliquez sur Suivant.%n%nLa recherche des mises à jour envoie seulement le numéro de version de l'application à lapigeonnerie.fr, jamais vos textes ni aucun identifiant. Elle peut aussi être désactivée plus tard, dans le menu de l'icône de FreeCorrector.
english.SelectTasksLabel2=Choose FreeCorrector's options, then click Next.%n%nThe update check sends only the app's version number to lapigeonnerie.fr, never your text nor any identifier. It can also be turned off later, in the menu of FreeCorrector's icon.

[CustomMessages]
french.StartupTask=Lancer FreeCorrector au démarrage de Windows
english.StartupTask=Start FreeCorrector with Windows
french.UpdatesTask=Rechercher les mises à jour une fois par jour
english.UpdatesTask=Check for updates once a day
french.NoWebView2=FreeCorrector a besoin de Microsoft Edge WebView2, qui ne semble pas installé sur ce PC.%n%nOuvrir la page de téléchargement de Microsoft ? L'installation de FreeCorrector continue dans tous les cas.
english.NoWebView2=FreeCorrector needs Microsoft Edge WebView2, which does not seem to be installed on this PC.%n%nOpen Microsoft's download page? FreeCorrector's installation goes on either way.
french.RemoveData=Supprimer aussi vos réglages et votre dictionnaire personnel ?%n%nRépondez Non si vous comptez réinstaller FreeCorrector.
english.RemoveData=Also delete your settings and your personal dictionary?%n%nAnswer No if you plan to install FreeCorrector again.

[Tasks]
Name: "startup"; Description: "{cm:StartupTask}"
Name: "updates"; Description: "{cm:UpdatesTask}"

[InstallDelete]
; What an earlier version left: the engines and the libraries come back complete.
Type: filesandordirs; Name: "{app}\engine"
Type: files; Name: "{app}\*.dll"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\FreeCorrector"; Filename: "{app}\FreeCorrector.exe"

[Registry]
; The same value as the app's "Start with Windows" (Startup.cs).
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "FreeCorrector"; ValueData: """{app}\FreeCorrector.exe"""; Tasks: startup
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: none; ValueName: "FreeCorrector"; Flags: deletevalue; Tasks: not startup
; Read by the app (Updates.cs), changed from its menu.
Root: HKCU; Subkey: "Software\LaPigeonnerie"; Flags: uninsdeletekeyifempty
Root: HKCU; Subkey: "Software\LaPigeonnerie\FreeCorrector"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\LaPigeonnerie\FreeCorrector"; ValueType: dword; ValueName: "CheckUpdates"; ValueData: 1; Tasks: updates
Root: HKCU; Subkey: "Software\LaPigeonnerie\FreeCorrector"; ValueType: dword; ValueName: "CheckUpdates"; ValueData: 0; Tasks: not updates

[Run]
Filename: "{app}\FreeCorrector.exe"; Description: "{cm:LaunchProgram,FreeCorrector}"; Flags: nowait postinstall

[UninstallRun]
Filename: "{app}\FreeCorrector.exe"; Parameters: "--quit"; RunOnceId: "QuitApp"; Flags: runhidden waituntilterminated

[Code]
const
  WebView2Client = 'Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';
  RunKey = 'Software\Microsoft\Windows\CurrentVersion\Run';

function HasVersion(Root: Integer; Key: String): Boolean;
var
  Version: String;
begin
  Result := RegQueryStringValue(Root, Key, 'pv', Version) and (Version <> '') and (Version <> '0.0.0.0');
end;

// Installed for the whole PC (64- or 32-bit registry) or for this user only.
function WebView2Installed: Boolean;
begin
  Result := HasVersion(HKLM, 'SOFTWARE\WOW6432Node\' + WebView2Client) or HasVersion(HKLM32, 'SOFTWARE\' + WebView2Client) or
    HasVersion(HKCU, 'Software\' + WebView2Client);
end;

function InitializeSetup: Boolean;
var
  Code: Integer;
begin
  Result := True;
  if not WebView2Installed then
    if SuppressibleMsgBox(CustomMessage('NoWebView2'), mbConfirmation, MB_YESNO, IDNO) = IDYES then
      ShellExec('open', 'https://developer.microsoft.com/microsoft-edge/webview2/', '', '', SW_SHOWNORMAL, ewNoWait, Code);
end;

// An update: the running app lets go of its files first.
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Code: Integer;
begin
  if FileExists(ExpandConstant('{app}\FreeCorrector.exe')) then
    Exec(ExpandConstant('{app}\FreeCorrector.exe'), '--quit', '', SW_HIDE, ewWaitUntilTerminated, Code);
  Result := '';
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Command: String;
begin
  if CurUninstallStep <> usPostUninstall then exit;
  // "Start with Windows", even when turned on from the app's menu.
  if RegQueryStringValue(HKCU, RunKey, 'FreeCorrector', Command) and
     (Pos(Lowercase(ExpandConstant('{app}')), Lowercase(Command)) > 0) then
    RegDeleteValue(HKCU, RunKey, 'FreeCorrector');
  // %LOCALAPPDATA%\FreeCorrector: the settings and dictionary (WebView2's
  // storage) and the log. Kept unless the user says otherwise.
  if DirExists(ExpandConstant('{localappdata}\FreeCorrector')) then
    if SuppressibleMsgBox(CustomMessage('RemoveData'), mbConfirmation, MB_YESNO, IDNO) = IDYES then
      DelTree(ExpandConstant('{localappdata}\FreeCorrector'), True, True, True);
end;
