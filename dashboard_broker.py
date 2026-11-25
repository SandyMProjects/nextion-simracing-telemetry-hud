import serial
import pyautogui
from pycaw.pycaw import AudioUtilities, ISimpleAudioVolume
import time

# --- PENGATURAN ---
COM_PORT = 'COM5' 
BAUD_RATE = 115200

def send_to_nextion(ser, command):
    """Mengirim perintah ke Nextion dengan akhiran 0xFF 0xFF 0xFF"""
    ser.write(command.encode('ascii'))
    ser.write(b'\xff\xff\xff')

def get_discord_volume():
    """Mengambil volume Discord saat ini (0-100)"""
    sessions = AudioUtilities.GetAllSessions()
    for session in sessions:
        if session.Process and session.Process.name() == "Discord.exe":
            volume = session._ctl.QueryInterface(ISimpleAudioVolume)
            return round(volume.GetMasterVolume() * 100)
    return None

def set_discord_volume(naik=True):
    """Mengatur volume Discord dan mengembalikan nilai barunya"""
    sessions = AudioUtilities.GetAllSessions()
    new_v = 0
    for session in sessions:
        if session.Process and session.Process.name() == "Discord.exe":
            volume = session._ctl.QueryInterface(ISimpleAudioVolume)
            current_v = volume.GetMasterVolume()
            step = 0.05 # Naik turun 5%
            new_v = min(1.0, current_v + step) if naik else max(0.0, current_v - step)
            volume.SetMasterVolume(new_v, None)
    return round(new_v * 100)

def main():
    try:
        ser = serial.Serial(COM_PORT, BAUD_RATE, timeout=0.1)
        print(f"[+] Terhubung ke Nextion di {COM_PORT}")
        
        last_action_time = 0
        debounce_delay = 0.3 # Delay 300ms agar tidak double click

        while True:
            # --- UPDATE PERSENTASE KE NEXTION (Setiap 1 Detik) ---
            current_v = get_discord_volume()
            if current_v is not None:
                send_to_nextion(ser, f'VolPercent.txt="{current_v}%"')

            # --- BACA INPUT DARI NEXTION ---
            if ser.in_waiting > 0:
                data = ser.readline().decode('utf-8', errors='ignore').strip()
                now = time.time()

                # Cek Debounce: abaikan jika input datang terlalu cepat
                if data and (now - last_action_time > debounce_delay):
                    print(f"[>] Input: {data}")
                    
                    if data == "B01": # VolUp
                        v = set_discord_volume(naik=True)
                        send_to_nextion(ser, f'VolPercent.txt="{v}%"')
                    
                    elif data == "B02": # VolDown
                        v = set_discord_volume(naik=False)
                        send_to_nextion(ser, f'VolPercent.txt="{v}%"')
                    
                    elif data == "B03": # Mic Mute
                        pyautogui.hotkey('ctrl', 'shift', 'm')
                    
                    elif data == "B04": # Deafen
                        pyautogui.hotkey('ctrl', 'shift', 'd')

                    last_action_time = now # Update waktu aksi terakhir

            time.sleep(0.05) # Biar CPU gak panas

    except Exception as e:
        print(f"[!] Error: {e}")

if __name__ == "__main__":
    main()