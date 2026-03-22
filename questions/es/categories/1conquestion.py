#!/usr/bin/env python3
import os
import json
from pathlib import Path
import tkinter as tk
from tkinter import scrolledtext, filedialog
from tkinter import ttk
import datetime

class LogWindow:
    def __init__(self, root):
        self.root = root
        self.root.title("Analizador JSON")
        self.root.geometry("700x500")
        
        # Crear frame principal
        main_frame = ttk.Frame(root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Frame para botones
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Área de texto con scroll para el log
        self.log_area = scrolledtext.ScrolledText(
            main_frame, 
            wrap=tk.WORD, 
            width=70, 
            height=20,
            font=("Consolas", 10)
        )
        self.log_area.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Botones
        self.btn_analizar = ttk.Button(
            button_frame,
            text="Analizar e Indentar JSON",
            command=self.procesar_archivos
        )
        self.btn_analizar.pack(side=tk.LEFT, padx=5)
        
        self.btn_limpiar = ttk.Button(
            button_frame,
            text="Limpiar log",
            command=self.limpiar_log
        )
        self.btn_limpiar.pack(side=tk.RIGHT, padx=5)

    def log(self, mensaje):
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        self.log_area.insert(tk.END, f"[{timestamp}] {mensaje}\n")
        self.log_area.see(tk.END)  # Auto-scroll al final
        self.root.update()

    def limpiar_log(self):
        self.log_area.delete(1.0, tk.END)

    def indentar_y_contar(self, archivo):
        try:
            # Leer el archivo JSON
            with open(archivo, 'r', encoding='utf-8') as f:
                contenido = f.read()
                # Contar ocurrencias antes de cargar el JSON
                cantidad = contenido.lower().count('"question"')
                # Cargar y formatear el JSON
                datos = json.loads(contenido)
            
            # Escribir el JSON indentado con 2 espacios
            with open(archivo, 'w', encoding='utf-8') as f:
                json.dump(datos, f, indent=2, ensure_ascii=False)
                
            return cantidad
            
        except Exception as e:
            self.log(f"Error al procesar {archivo}: {str(e)}")
            return 0

    def procesar_archivos(self):
        self.btn_analizar.config(state='disabled')
        try:
            # Obtener el directorio actual donde se encuentra el script
            directorio_actual = Path(__file__).parent
            
            self.log("Iniciando procesamiento de archivos JSON...")
            self.log("Buscando archivos JSON en el directorio actual...")
            
            # Buscar todos los archivos .json en el directorio
            archivos_json = list(directorio_actual.glob('*.json'))
            
            if not archivos_json:
                self.log("No se encontraron archivos JSON en el directorio actual.")
                return
            
            self.log("\nResultados del análisis:")
            self.log("-" * 50)
            
            total_questions = 0
            
            # Procesar cada archivo JSON encontrado
            for archivo in archivos_json:
                self.log(f"Procesando archivo: {archivo.name}")
                cantidad = self.indentar_y_contar(archivo)
                if cantidad > 0:
                    self.log(f"✓ Archivo indentado correctamente")
                    self.log(f"✓ Encontradas {cantidad} ocurrencias de 'question'")
                total_questions += cantidad
                self.log("-" * 30)
            
            self.log("-" * 50)
            self.log(f"Total de 'question' en todos los archivos: {total_questions}")
            self.log(f"Total de archivos JSON procesados: {len(archivos_json)}")
            self.log("\nProcesamiento completado.")
            
        except Exception as e:
            self.log(f"Error durante el procesamiento: {str(e)}")
        finally:
            self.btn_analizar.config(state='normal')

def main():
    root = tk.Tk()
    app = LogWindow(root)
    root.mainloop()

if __name__ == "__main__":
    main() 