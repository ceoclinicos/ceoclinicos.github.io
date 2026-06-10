#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JSON Cite Cleaner - Herramienta para eliminar referencias [cite: X] de archivos JSON
Autor: Asistente AI
Versión: 1.0
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import os
import re
import json
from pathlib import Path
import threading

class JSONCiteCleaner:
    def __init__(self, root):
        self.root = root
        self.root.title("JSON Cite Cleaner v1.0")
        self.root.geometry("800x600")
        self.root.resizable(True, True)
        
        # Variables
        self.selected_folder = tk.StringVar()
        self.processing = False
        
        self.setup_ui()
        
    def setup_ui(self):
        """Configurar la interfaz de usuario"""
        # Frame principal
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configurar grid
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # Título
        title_label = ttk.Label(main_frame, text="JSON Cite Cleaner", 
                               font=("Arial", 16, "bold"))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Selección de carpeta
        ttk.Label(main_frame, text="Carpeta a procesar:").grid(row=1, column=0, sticky=tk.W, pady=5)
        
        folder_frame = ttk.Frame(main_frame)
        folder_frame.grid(row=1, column=1, columnspan=2, sticky=(tk.W, tk.E), pady=5)
        folder_frame.columnconfigure(0, weight=1)
        
        self.folder_entry = ttk.Entry(folder_frame, textvariable=self.selected_folder, width=50)
        self.folder_entry.grid(row=0, column=0, sticky=(tk.W, tk.E), padx=(0, 5))
        
        ttk.Button(folder_frame, text="Seleccionar Carpeta", 
                  command=self.select_folder).grid(row=0, column=1)
        
        # Opciones de procesamiento
        options_frame = ttk.LabelFrame(main_frame, text="Opciones", padding="10")
        options_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=10)
        
        self.backup_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(options_frame, text="Crear respaldo de archivos originales", 
                       variable=self.backup_var).grid(row=0, column=0, sticky=tk.W, pady=2)
        
        self.recursive_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(options_frame, text="Buscar en subcarpetas", 
                       variable=self.recursive_var).grid(row=1, column=0, sticky=tk.W, pady=2)
        
        # Botones
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=3, column=0, columnspan=3, pady=20)
        
        self.process_btn = ttk.Button(button_frame, text="Procesar Archivos", 
                                    command=self.start_processing, style="Accent.TButton")
        self.process_btn.pack(side=tk.LEFT, padx=5)
        
        ttk.Button(button_frame, text="Limpiar Log", 
                  command=self.clear_log).pack(side=tk.LEFT, padx=5)
        
        # Barra de progreso
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(main_frame, variable=self.progress_var, 
                                         maximum=100, length=400)
        self.progress_bar.grid(row=4, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=10)
        
        # Área de log
        log_frame = ttk.LabelFrame(main_frame, text="Registro de Procesamiento", padding="5")
        log_frame.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=10)
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=15, width=80)
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configurar grid para expansión
        main_frame.rowconfigure(5, weight=1)
        
    def select_folder(self):
        """Seleccionar carpeta para procesar"""
        folder = filedialog.askdirectory(title="Seleccionar carpeta con archivos JSON")
        if folder:
            self.selected_folder.set(folder)
            self.log(f"📁 Carpeta seleccionada: {folder}")
    
    def log(self, message):
        """Agregar mensaje al log"""
        self.log_text.insert(tk.END, f"{message}\n")
        self.log_text.see(tk.END)
        self.root.update_idletasks()
    
    def clear_log(self):
        """Limpiar el área de log"""
        self.log_text.delete(1.0, tk.END)
    
    def find_json_files(self, folder_path, recursive=True):
        """Encontrar todos los archivos JSON en la carpeta"""
        json_files = []
        folder = Path(folder_path)
        
        if recursive:
            pattern = "**/*.json"
        else:
            pattern = "*.json"
        
        for file_path in folder.glob(pattern):
            if file_path.is_file():
                json_files.append(file_path)
        
        return json_files
    
    def clean_cite_references(self, content):
        """Limpiar referencias [cite: X] del contenido"""
        # Patrón regex para capturar [cite: X], [cite: X, Y], [cite: X, Y, Z], etc.
        pattern = r'\[cite:\s*[\d,\s]+\]'
        cleaned_content = re.sub(pattern, '', content)
        return cleaned_content
    
    def process_file(self, file_path, backup=True):
        """Procesar un archivo JSON individual"""
        try:
            # Leer archivo
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Verificar si hay referencias cite
            if '[cite:' not in content:
                return False, "No se encontraron referencias [cite: X]"
            
            # Crear respaldo si se solicita
            if backup:
                backup_path = file_path.with_suffix('.json.backup')
                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            
            # Limpiar referencias
            cleaned_content = self.clean_cite_references(content)
            
            # Contar referencias eliminadas
            original_count = len(re.findall(r'\[cite:\s*[\d,\s]+\]', content))
            
            # Escribir archivo limpio
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(cleaned_content)
            
            return True, f"✅ {original_count} referencias eliminadas"
            
        except Exception as e:
            return False, f"❌ Error: {str(e)}"
    
    def start_processing(self):
        """Iniciar procesamiento en hilo separado"""
        if self.processing:
            messagebox.showwarning("Advertencia", "Ya hay un procesamiento en curso")
            return
        
        if not self.selected_folder.get():
            messagebox.showerror("Error", "Por favor selecciona una carpeta")
            return
        
        # Iniciar procesamiento en hilo separado
        thread = threading.Thread(target=self.process_files)
        thread.daemon = True
        thread.start()
    
    def process_files(self):
        """Procesar todos los archivos JSON"""
        self.processing = True
        self.process_btn.config(state='disabled')
        
        try:
            folder_path = self.selected_folder.get()
            self.log(f"🚀 Iniciando procesamiento en: {folder_path}")
            
            # Encontrar archivos JSON
            json_files = self.find_json_files(folder_path, self.recursive_var.get())
            
            if not json_files:
                self.log("⚠️ No se encontraron archivos JSON en la carpeta")
                return
            
            self.log(f"📄 Se encontraron {len(json_files)} archivos JSON")
            
            # Procesar cada archivo
            processed_count = 0
            total_files = len(json_files)
            
            for i, file_path in enumerate(json_files):
                self.log(f"📝 Procesando: {file_path.name}")
                
                success, message = self.process_file(file_path, self.backup_var.get())
                
                if success:
                    processed_count += 1
                    self.log(f"   {message}")
                else:
                    self.log(f"   {message}")
                
                # Actualizar barra de progreso
                progress = ((i + 1) / total_files) * 100
                self.progress_var.set(progress)
                self.root.update_idletasks()
            
            # Resumen final
            self.log(f"\n🎉 Procesamiento completado!")
            self.log(f"📊 Archivos procesados: {processed_count}/{total_files}")
            self.log(f"💾 Respaldos creados: {'Sí' if self.backup_var.get() else 'No'}")
            
            messagebox.showinfo("Completado", 
                              f"Procesamiento completado!\n"
                              f"Archivos procesados: {processed_count}/{total_files}")
            
        except Exception as e:
            self.log(f"❌ Error durante el procesamiento: {str(e)}")
            messagebox.showerror("Error", f"Error durante el procesamiento:\n{str(e)}")
        
        finally:
            self.processing = False
            self.process_btn.config(state='normal')
            self.progress_var.set(0)

def main():
    """Función principal"""
    root = tk.Tk()
    
    # Configurar estilo
    style = ttk.Style()
    style.theme_use('clam')
    
    # Crear aplicación
    app = JSONCiteCleaner(root)
    
    # Centrar ventana
    root.update_idletasks()
    x = (root.winfo_screenwidth() // 2) - (root.winfo_width() // 2)
    y = (root.winfo_screenheight() // 2) - (root.winfo_height() // 2)
    root.geometry(f"+{x}+{y}")
    
    # Iniciar aplicación
    root.mainloop()

if __name__ == "__main__":
    main()
