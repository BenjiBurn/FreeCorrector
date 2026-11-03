# Writes Interop.UIAutomationClient.dll into -Out: the .NET view of Windows'
# native UI Automation interfaces, converted from the type library inside
# UIAutomationCore.dll (what tlbimp does, without the Windows SDK). Runs in
# Windows PowerShell, whose .NET Framework still has the converter.
param([Parameter(Mandatory)] [string]$Out)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Reflection;
using System.Runtime.InteropServices;
public class FcTypeLibSink : ITypeLibImporterNotifySink {
    public void ReportEvent(ImporterEventKind kind, int code, string message) { }
    public Assembly ResolveRef(object typeLib) { return null; }
}
public static class FcTypeLib {
    [DllImport("oleaut32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
    static extern void LoadTypeLibEx(string file, int kind, [MarshalAs(UnmanagedType.Interface)] out object typeLib);
    public static void Convert(string dll) {
        object lib;
        LoadTypeLibEx(dll, 2, out lib); // REGKIND_NONE
        var builder = new TypeLibConverter().ConvertTypeLibToAssembly(lib, "Interop.UIAutomationClient.dll",
            TypeLibImporterFlags.None, new FcTypeLibSink(), null, null, "Interop.UIAutomationClient", null);
        builder.Save("Interop.UIAutomationClient.dll");
    }
}
'@
New-Item -ItemType Directory -Force $Out | Out-Null
$Out = (Resolve-Path $Out).Path
# AssemblyBuilder.Save writes to the process directory, not PowerShell's location.
$before = [Environment]::CurrentDirectory
[Environment]::CurrentDirectory = $Out
try { [FcTypeLib]::Convert("$env:WINDIR\System32\UIAutomationCore.dll") } finally { [Environment]::CurrentDirectory = $before }
Get-Item (Join-Path $Out 'Interop.UIAutomationClient.dll') | Select-Object Name, Length
