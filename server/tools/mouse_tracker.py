import pyautogui
import time
import os

def clear():
    os.system('cls' if os.name == 'nt' else 'clear')

print("=== Asistente de Mapeo de Coordenadas ===")
print("Este script te ayudará a encontrar las posiciones X, Y de los botones de Oracle.")
print("Mueve el mouse sobre el elemento que quieras medir.")
print("Presiona Ctrl+C para detener el script.\n")

try:
    while True:
        x, y = pyautogui.position()
        position_str = 'X: ' + str(x).rjust(4) + ' Y: ' + str(y).rjust(4)
        print(position_str, end='')
        print('\b' * len(position_str), end='', flush=True)
        time.sleep(0.1)
except KeyboardInterrupt:
    print('\n¡Listo!')
