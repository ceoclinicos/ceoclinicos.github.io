# -*- coding: utf-8 -*-
"""
Sube carpetas o archivos del proyecto al repositorio de GitHub.
Con interfaz gráfica o por línea de comandos.
Uso:
  python subir_repo.py                    → abre la interfaz gráfica
  python subir_repo.py website_clinicos "actualizar guías"  → CLI y pausa al final
"""
import os
import sys
import subprocess
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def subir(ruta, mensaje, log_fn=None):
    """Ejecuta git add, commit, push. log_fn(texto) para mostrar salida. Devuelve (ok, texto_salida)."""
    def log(s):
        if log_fn:
            log_fn(s)
        else:
            print(s)

    if not os.path.exists(ruta):
        log("No existe la ruta: " + ruta)
        return False, "No existe la ruta."

    cwd = ruta if os.path.isdir(ruta) else os.path.dirname(ruta)
    p = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        cwd=cwd, capture_output=True, text=True, timeout=5
    )
    if p.returncode != 0:
        cwd = SCRIPT_DIR
        p = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=cwd, capture_output=True, text=True, timeout=5
        )
    if p.returncode != 0:
        log("No se encontró un repositorio git.")
        return False, "No se encontró un repositorio git."

    repo_root = p.stdout.strip()
    rel = os.path.relpath(ruta, repo_root)
    if rel.startswith(".."):
        log("La ruta está fuera del repositorio.")
        return False, "Ruta fuera del repo."

    log("Repo: " + repo_root)
    log("Añadiendo: " + rel)
    log("Mensaje: " + mensaje)
    log("")

    add = subprocess.run(["git", "add", rel], cwd=repo_root, capture_output=True, text=True, timeout=10)
    if add.returncode != 0:
        log("Error git add: " + (add.stderr or add.stdout or ""))
        return False, add.stderr or add.stdout or "Error en git add"

    commit = subprocess.run(["git", "commit", "-m", mensaje], cwd=repo_root, capture_output=True, text=True, timeout=10)
    log(commit.stdout or "")
    if commit.returncode != 0 and "nothing to commit" not in (commit.stdout or "").lower():
        log(commit.stderr or "")

    push = subprocess.run(["git", "push"], cwd=repo_root, capture_output=True, text=True, timeout=60)
    out = push.stdout or ""
    err = push.stderr or ""
    log(out)
    if err:
        log(err)
    if push.returncode != 0:
        log("\n>>> PUSH FALLÓ. Revisa credenciales (token) o conexión.")
        return False, err or out
    log("\n>>> Listo. Cambios subidos al repositorio.")
    return True, out


def main_cli():
    """Modo línea de comandos: sube y pausa al final para ver errores."""
    script_dir = SCRIPT_DIR
    if len(sys.argv) >= 2 and sys.argv[1].strip():
        path_arg = sys.argv[1].strip()
        ruta = os.path.normpath(os.path.join(script_dir, path_arg))
    else:
        ruta = os.path.join(script_dir, ".")
    mensaje = "Actualizar contenido" if len(sys.argv) < 3 else sys.argv[2].strip()

    ok, _ = subir(ruta, mensaje)
    print("")
    input("Presiona Enter para cerrar...")
    sys.exit(0 if ok else 1)


def main_gui():
    root = tk.Tk()
    root.title("Subir al repositorio")
    root.geometry("620x420")
    root.minsize(500, 350)

    # Ruta
    f_path = ttk.LabelFrame(root, text="Carpeta o archivo a subir", padding=10)
    f_path.pack(fill=tk.X, padx=10, pady=5)
    var_ruta = tk.StringVar(value=os.path.join(SCRIPT_DIR, "."))
    ttk.Entry(f_path, textvariable=var_ruta, width=70).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8))
    def elegir():
        d = filedialog.askdirectory(initialdir=var_ruta.get() or SCRIPT_DIR, title="Seleccionar carpeta")
        if d:
            var_ruta.set(d)
    ttk.Button(f_path, text="Elegir carpeta", command=elegir).pack(side=tk.LEFT)

    # Mensaje commit
    f_msg = ttk.LabelFrame(root, text="Mensaje del commit", padding=10)
    f_msg.pack(fill=tk.X, padx=10, pady=5)
    var_msg = tk.StringVar(value="Actualizar contenido")
    ttk.Entry(f_msg, textvariable=var_msg, width=70).pack(fill=tk.X)

    # Salida
    f_out = ttk.LabelFrame(root, text="Salida (revisa si hay error)", padding=5)
    f_out.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
    txt = scrolledtext.ScrolledText(f_out, height=12, font=("Consolas", 9), wrap=tk.WORD)
    txt.pack(fill=tk.BOTH, expand=True)

    def log(s):
        txt.insert(tk.END, s + "\n")
        txt.see(tk.END)
        root.update_idletasks()

    def hacer_subida():
        ruta = var_ruta.get().strip()
        msg = var_msg.get().strip() or "Actualizar contenido"
        if not ruta:
            messagebox.showwarning("Falta ruta", "Indica la carpeta o archivo a subir.")
            return
        txt.delete(1.0, tk.END)
        ok, _ = subir(ruta, msg, log_fn=log)
        if ok:
            messagebox.showinfo("Listo", "Cambios subidos al repositorio.")
        else:
            messagebox.showwarning("Error", "Revisa la salida. Puede ser token de GitHub o conexión.")

    ttk.Button(root, text="Subir al repositorio", command=hacer_subida).pack(pady=8)
    ttk.Label(root, text="Si el push falla, usa en GitHub un Personal Access Token como contraseña.", font=("", 8), foreground="gray").pack(pady=(0, 5))

    root.mainloop()


if __name__ == "__main__":
    if len(sys.argv) >= 2:
        main_cli()
    else:
        main_gui()
