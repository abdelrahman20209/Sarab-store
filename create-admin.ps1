# Creates the admin login (email + password) in Firebase Auth for project sarab-3tor.
# The password is typed here in the terminal only - it is never saved to a file.
$ErrorActionPreference = 'Stop'
$apiKey = 'AIzaSyAi3ae1vCSip7C7VTBOSdyyTDMbhD_pZuw'   # public web key (same one the site uses)

$email = Read-Host 'Admin email'
$sec1  = Read-Host 'Password (min 8 chars)' -AsSecureString
$sec2  = Read-Host 'Repeat password' -AsSecureString
$toPlain = { param($s) [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)) }
$p1 = & $toPlain $sec1
$p2 = & $toPlain $sec2
if ($p1 -cne $p2) { Write-Host 'Passwords do not match.' -ForegroundColor Red; exit 1 }
if ($p1.Length -lt 8) { Write-Host 'Password is too short (min 8).' -ForegroundColor Red; exit 1 }

$body = @{ email = $email.Trim(); password = $p1; returnSecureToken = $true } | ConvertTo-Json
try {
  $r = Invoke-RestMethod -Method Post -ContentType 'application/json' -Body $body `
        -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$apiKey"
} catch {
  $msg = $_.ErrorDetails.Message
  if ($msg -match 'EMAIL_EXISTS') {
    Write-Host 'This email already has an account. Sign in at /admin.html, or reset the password from Firebase Console > Authentication.' -ForegroundColor Yellow
  } elseif ($msg -match 'OPERATION_NOT_ALLOWED') {
    Write-Host 'Email/Password sign-in is disabled. Enable it: Firebase Console > Authentication > Sign-in method > Email/Password.' -ForegroundColor Yellow
  } else {
    Write-Host "Failed: $msg" -ForegroundColor Red
  }
  exit 1
}

Write-Host ''
Write-Host 'Admin account created.' -ForegroundColor Green
Write-Host "Email : $($r.email)"
Write-Host "UID   : $($r.localId)"
Write-Host ''
Write-Host 'Next: Firebase Console > Firestore > create collection "admins", document ID = the UID above, field role = "admin".'
Write-Host 'Admin page: https://sarab-a22.pages.dev/admin.html'
