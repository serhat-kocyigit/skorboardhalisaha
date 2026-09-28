import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

TARGET = "192.168.1.141"
PINGS_PER_SECOND = 25000
DURATION_SECONDS = 60 * 60

sent = 0
received = 0

def ping_once():
    result = subprocess.run(
        ["ping", "-n", "1", "-w", "900", TARGET],
        capture_output=True,
        text=True
    )

    return "TTL=" in result.stdout.upper()


start_time = time.time()

with ThreadPoolExecutor(max_workers=10) as executor:

    while time.time() - start_time < DURATION_SECONDS:

        second_start = time.time()

        futures = [
            executor.submit(ping_once)
            for _ in range(PINGS_PER_SECOND)
        ]

        for future in as_completed(futures):

            sent += 1

            try:
                if future.result():
                    received += 1
            except Exception as e:
                print(f"Ping hatası: {e}")

        lost = sent - received

        loss_percent = (
            (lost / sent) * 100
            if sent > 0
            else 0
        )

        elapsed = int(time.time() - start_time)

        print(
            f"Süre: {elapsed}s | "
            f"Gönderilen: {sent} | "
            f"Cevap: {received} | "
            f"Kayıp: {lost} | "
            f"Kayıp: %{loss_percent:.2f}"
        )

        remaining = 1 - (time.time() - second_start)

        if remaining > 0:
            time.sleep(remaining)


print("\n=== TEST TAMAMLANDI ===")

lost = sent - received

print(f"Toplam gönderilen : {sent}")
print(f"Toplam cevap      : {received}")
print(f"Toplam kayıp      : {lost}")

if sent:
    print(f"Kayıp oranı       : %{lost / sent * 100:.2f}")