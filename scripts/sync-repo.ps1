param (
    [string]$CommitMessage = "chore: platform updates"
)

# Script de sincronización automática a GitHub con token de Windows Credential Manager
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class GitAutoSync {
    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);
    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern void CredFree(IntPtr credentialPtr);
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public long LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }
    public static string ReadCred(string target) {
        IntPtr credPtr;
        if (CredRead(target, 1, 0, out credPtr)) {
            var cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
            byte[] blob = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, blob, 0, cred.CredentialBlobSize);
            CredFree(credPtr);
            return System.Text.Encoding.UTF8.GetString(blob);
        }
        return null;
    }
}
"@

$token = [GitAutoSync]::ReadCred("GitHub - https://api.github.com/yerzonorbegoso-cmd")
if ($token) {
    $status = git status --porcelain
    if ($status) {
        git add .
        git commit -m $CommitMessage
    }
    git push "https://yerzonorbegoso-cmd:$token@github.com/yerzonorbegoso-cmd/linguevia.git" main
    git fetch origin main
} else {
    Write-Error "No se encontró el token de autenticación de GitHub."
}
