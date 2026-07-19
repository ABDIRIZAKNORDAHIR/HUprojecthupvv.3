Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
folder = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = folder
WshShell.Run "cmd /c """ & folder & "\START_HERE.bat""", 1, False
