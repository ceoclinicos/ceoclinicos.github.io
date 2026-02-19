# -*- coding: utf-8 -*-
"""
Sube uno o varios archivos/carpetas al repositorio de GitHub.
- Una carpeta: se sube ella y todo su contenido.
- Varios archivos/carpetas: se añaden todos en un solo commit y push.

Uso:
  python subir_repo.py                          → abre la interfaz gráfica
  python subir_repo.py . "mensaje"              → sube la carpeta actual (CLI, pausa al final)
  python subir_repo.py guias.json "actualizar"  → sube un archivo
  python subir_repo.py app.js index.html "cambios web"  → sube varios archivos (último arg = mensaje)
"""
import os
import sys
import subprocess
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def _rutas_a_lista(ruta_o_lista):
    """Convierte string (una o varias líneas/comas) o lista en lista de rutas normalizadas."""
    if isinstance(ruta_o_lista, (list, tuple)):
        lista = list(ruta_o_lista)
    else:
        s = (ruta_o_lista or "").strip().replace(",", "\n")
        lista = [x.strip() for x in s.splitlines() if x.strip()]
    return [os.path.normpath(p) for p in lista]


def subir(ruta_o_rutas, mensaje, log_fn=None):
    """Sube uno o más archivos/carpetas: git add de todos, un commit y push.
    ruta_o_rutas: path (str) o varios separados por coma/línea, o lista de paths.
    Devuelve (ok, texto_salida)."""
    def log(s):
        if log_fn:
            log_fn(s)
        else:
            print(s)

    rutas = _rutas_a_lista(ruta_o_rutas)
    if not rutas:
        log("No hay ninguna ruta indicada.")
        return False, "Sin rutas"

    for r in rutas:
        if not os.path.exists(r):
            log("No existe: " + r)
            return False, "No existe la ruta."

    cwd = os.path.dirname(rutas[0]) if os.path.isfile(rutas[0]) else rutas[0]
    p = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        cwd=cwd, capture_output=True, text=True, timeout=5
    )
    if p.returncode != 0:
        p = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=SCRIPT_DIR, capture_output=True, text=True, timeout=5
        )
    if p.returncode != 0:
        log("No se encontró un repositorio git.")
        return False, "No hay repo git."

    repo_root = p.stdout.strip()
    rels = []
    for r in rutas:
        rel = os.path.relpath(r, repo_root)
        if rel.startswith(".."):
            log("Fuera del repo: " + r)
            return False, "Ruta fuera del repo"
        rels.append(rel)

    log("Repo: " + repo_root)
    log("Añadiendo: " + ", ".join(rels))
    log("Mensaje: " + mensaje)
    log("")

    add = subprocess.run(["git", "add"] + rels, cwd=repo_root, capture_output=True, text=True, timeout=15)
    if add.returncode != 0:
        log("Error git add: " + (add.stderr or add.stdout or ""))
        return False, add.stderr or add.stdout or "Error git add"

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
    """Modo línea de comandos: sube uno o más paths. Si hay 2+ args, el último es el mensaje. Pausa al final."""
    script_dir = SCRIPT_DIR
    args = [x.strip() for x in sys.argv[1:] if x.strip()]
    if not args:
        ruta = os.path.join(script_dir, ".")
        mensaje = "Actualizar contenido"
    elif len(args) == 1:
        ruta = os.path.normpath(os.path.join(script_dir, args[0]))
        mensaje = "Actualizar contenido"
    else:
        mensaje = args[-1]
        paths = [os.path.normpath(os.path.join(script_dir, p)) for p in args[:-1]]
        ruta = paths[0] if len(paths) == 1 else paths

    ok, _ = subir(ruta, mensaje)
    print("")
    input("Presiona Enter para cerrar...")
    sys.exit(0 if ok else 1)


def main_gui():
    root = tk.Tk()
    root.title("Subir al repositorio")
    root.geometry("620x420")
    root.minsize(500, 350)

    # Rutas (una o varias líneas = una o varias carpetas/archivos)
    f_path = ttk.LabelFrame(root, text="Carpeta(s) o archivo(s) a subir (uno por línea, o varios)", padding=10)
    f_path.pack(fill=tk.X, padx=10, pady=5)
    txt_rutas = tk.Text(f_path, height=3, width=70, font=("Consolas", 9))
    txt_rutas.insert("1.0", os.path.join(SCRIPT_DIR, "."))
    txt_rutas.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8))
    fr_btns = ttk.Frame(f_path)
    fr_btns.pack(side=tk.RIGHT)
    def elegir_carpeta():
        d = filedialog.askdirectory(initialdir=SCRIPT_DIR, title="Seleccionar carpeta")
        if d:
            txt_rutas.insert(tk.END, "\n" + d)
    def elegir_archivos():
        fs = filedialog.askopenfilenames(initialdir=SCRIPT_DIR, title="Seleccionar archivo(s)")
        if fs:
            txt_rutas.insert(tk.END, "\n" + "\n".join(fs))
    ttk.Button(fr_btns, text="+ Carpeta", command=elegir_carpeta).pack(fill=tk.X, pady=1)
    ttk.Button(fr_btns, text="+ Archivos", command=elegir_archivos).pack(fill=tk.X, pady=1)

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
        rutas_texto = txt_rutas.get("1.0", tk.END).strip()
        msg = var_msg.get().strip() or "Actualizar contenido"
        if not rutas_texto:
            messagebox.showwarning("Falta ruta", "Indica al menos una carpeta o archivo a subir.")
            return
        txt.delete(1.0, tk.END)
        ok, _ = subir(rutas_texto, msg, log_fn=log)
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
