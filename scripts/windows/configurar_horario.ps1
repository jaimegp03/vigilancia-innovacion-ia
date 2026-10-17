# Configura en Windows el encendido y la suspension del PC para que n8n (Docker) este activo
# a la hora de los workflows. Ejecutalo UNA vez, en PowerShell como administrador:
#
#   powershell -ExecutionPolicy Bypass -File scripts\windows\configurar_horario.ps1
#
# Crea dos tareas programadas:
#   "Vigilancia IA - Despertar":  cada dia 06:45, despierta el PC y abre Docker Desktop.
#   "Vigilancia IA - Suspender":  cada dia 08:00, suspende el PC.
# Para cambiar las horas:   ... -HoraDespertar 06:30 -HoraSuspender 08:30
# Para deshacerlo:          ... -Quitar
# (Sin acentos a proposito: PowerShell 5.1 los lee mal si el archivo no lleva BOM.)
param(
    [string]$HoraDespertar = '06:45',
    [string]$HoraSuspender = '08:00',
    [switch]$Quitar
)

$nombreDespertar = 'Vigilancia IA - Despertar'
$nombreSuspender = 'Vigilancia IA - Suspender'

$esAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host 'Abre PowerShell como administrador (clic derecho > Ejecutar como administrador) y vuelve a ejecutar el script.' -ForegroundColor Red
    exit 1
}

if ($Quitar) {
    foreach ($n in $nombreDespertar, $nombreSuspender) {
        Unregister-ScheduledTask -TaskName $n -Confirm:$false -ErrorAction SilentlyContinue
    }
    Write-Host 'Tareas eliminadas.' -ForegroundColor Green
    exit 0
}

$usuario = "$env:USERDOMAIN\$env:USERNAME"
# Interactive: la tarea corre en tu sesion (Docker Desktop lo necesita), por eso no pide contrasena.
$principal = New-ScheduledTaskPrincipal -UserId $usuario -LogonType Interactive -RunLevel Limited

$ajustes = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

# 1) Despertar y abrir Docker Desktop (si ya esta abierto, no hace nada)
$docker = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
$ordenDocker = "if (-not (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue)) { Start-Process '$docker' }"
$accionDespertar = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -Command `"$ordenDocker`""
$disparadorDespertar = New-ScheduledTaskTrigger -Daily -At $HoraDespertar
Register-ScheduledTask -TaskName $nombreDespertar -Action $accionDespertar -Trigger $disparadorDespertar -Settings $ajustes -Principal $principal -Force | Out-Null

# 2) Suspender el PC
$accionSuspender = New-ScheduledTaskAction -Execute 'rundll32.exe' -Argument 'powrprof.dll,SetSuspendState 0,1,0'
$disparadorSuspender = New-ScheduledTaskTrigger -Daily -At $HoraSuspender
Register-ScheduledTask -TaskName $nombreSuspender -Action $accionSuspender -Trigger $disparadorSuspender -Settings $ajustes -Principal $principal -Force | Out-Null

# 3) Permitir temporizadores de reactivacion (con enchufe y con bateria)
powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP RTCWAKE 1 | Out-Null
powercfg /setdcvalueindex SCHEME_CURRENT SUB_SLEEP RTCWAKE 1 | Out-Null
powercfg /setactive SCHEME_CURRENT | Out-Null

Write-Host "Listo. El PC despertara a las $HoraDespertar y se suspendera a las $HoraSuspender." -ForegroundColor Green
Write-Host 'Recuerda: deja la sesion iniciada (puede estar bloqueada), el PC enchufado y activa en Docker Desktop "Start Docker Desktop when you sign in".'
