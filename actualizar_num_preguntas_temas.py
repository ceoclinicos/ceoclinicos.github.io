# -*- coding: utf-8 -*-
"""
Herramienta: analiza JSON en temas/es/, cuenta preguntas y opcionalmente
actualiza numPreguntas en temas/temas.json.

La web usa temas/{lang}/{topicId}_questions.json (ver content-paths.js).
Si el id del catálogo no coincide con el nombre del archivo, añade entrada
en TEMA_ID_A_ARCHIVO_ES.
"""
from __future__ import annotations

import json
import sys
import traceback
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, scrolledtext, ttk
except ImportError as e:
    print("Tkinter no disponible:", e)
    sys.exit(1)


# Cuando no existe {id}_questions.json pero sí otro nombre (renombrar archivos es preferible).
TEMA_ID_A_ARCHIVO_ES: Dict[str, str] = {
    "introducción_medio_interno": (
        "introducción_y_medio_interno;_agua;electrolitos;_equilibrio_ácido-base_questions.json"
    ),
    "biomoléculas": (
        "biomoléculas_aminoácidos;_enlace_peptídico;_proteínas_(plasmáticas_y_no_plasmáticas);"
        "_hemoglobina_y_enzimas_(cinética;inhibición;_regulación)._questions.json"
    ),
}


@dataclass
class FilaAnalisis:
    tema_id: str
    titulo: str
    ruta_json: str
    modo_resolucion: str
    cuenta: int
    num_preguntas_catalogo: int
    coincide: bool
    errores_estructura: List[str] = field(default_factory=list)
    advertencias: List[str] = field(default_factory=list)


def _raiz_script() -> Path:
    return Path(__file__).resolve().parent


def _ruta_relativa_o_abs(path: Path, base: Path) -> str:
    try:
        return str(path.relative_to(base))
    except ValueError:
        return str(path)


def _resolver_archivo_tema(es_dir: Path, tema_id: str) -> Tuple[Optional[Path], str]:
    estandar = es_dir / f"{tema_id}_questions.json"
    if estandar.is_file():
        return estandar, "estándar ({id}_questions.json)"
    if tema_id in TEMA_ID_A_ARCHIVO_ES:
        alias = es_dir / TEMA_ID_A_ARCHIVO_ES[tema_id]
        if alias.is_file():
            return alias, "alias (TEMA_ID_A_ARCHIVO_ES)"
        return None, "alias configurado pero archivo ausente"
    legacy = es_dir / f"{tema_id}.json"
    if legacy.is_file():
        return legacy, "legado (.json sin _questions) — la web NO usa esta ruta"
    return None, "sin archivo"


def _validar_item_pregunta(i: int, q: Any) -> List[str]:
    errs: List[str] = []
    if not isinstance(q, dict):
        errs.append(f"questions[{i}] no es un objeto")
        return errs
    for k in ("question", "options", "correctAnswer"):
        if k not in q:
            errs.append(f"questions[{i}] falta clave '{k}'")
    if "options" in q and isinstance(q["options"], list) and len(q["options"]) < 2:
        errs.append(f"questions[{i}] tiene menos de 2 opciones")
    return errs


def _analizar_archivo_json(path: Path) -> Tuple[Optional[int], List[str], List[str]]:
    """Devuelve (n_preguntas o None si el archivo no es contable, errores, advertencias)."""
    errores: List[str] = []
    advertencias: List[str] = []
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as e:
        return None, [f"No se pudo leer: {e}"], []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        return None, [f"JSON inválido: {e}"], []

    if not isinstance(data, dict):
        return None, ["La raíz del JSON no es un objeto"], []

    if "questions" not in data:
        return None, ["Falta la clave 'questions'"], []

    qs = data["questions"]
    if not isinstance(qs, list):
        return None, ["'questions' no es un array"], []

    for idx, item in enumerate(qs):
        errs = _validar_item_pregunta(idx, item)
        errores.extend(errs)
        if len(errores) > 40:
            errores.append("… (más errores omitidos)")
            break

    if not errores and len(qs) == 0:
        advertencias.append("Array 'questions' vacío")

    return len(qs), errores, advertencias


def ejecutar_analisis(
    es_dir: Path, temas_json: Path
) -> Tuple[List[FilaAnalisis], List[str], Set[str], Dict[str, int]]:
    """
    Devuelve: filas, log_errores_globales, paths_usados_por_catalogo, conteo_por_id
    """
    log_global: List[str] = []
    if not temas_json.is_file():
        log_global.append(f"No existe temas.json: {temas_json}")
        return [], log_global, set(), {}

    try:
        catalogo = json.loads(temas_json.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        log_global.append(f"Error leyendo temas.json: {e}")
        return [], log_global, set(), {}

    temas = catalogo.get("temas")
    if not isinstance(temas, list):
        log_global.append("temas.json: 'temas' no es un array")
        return [], log_global, set(), {}

    ids_vistos: Dict[str, int] = {}
    for t in temas:
        if isinstance(t, dict) and "id" in t:
            tid = str(t["id"])
            ids_vistos[tid] = ids_vistos.get(tid, 0) + 1
    duplicados = [k for k, n in ids_vistos.items() if n > 1]
    if duplicados:
        log_global.append(
            "ADVERTENCIA: ids duplicados en el catálogo (varias entradas comparten id): "
            + ", ".join(sorted(duplicados))
        )

    filas: List[FilaAnalisis] = []
    usados: Set[str] = set()
    conteo_por_id: Dict[str, int] = {}

    for t in temas:
        if not isinstance(t, dict):
            log_global.append("Entrada en 'temas' que no es objeto; se omite")
            continue
        tema_id = t.get("id")
        if not isinstance(tema_id, str) or not tema_id:
            log_global.append("Tema sin 'id' válido; se omite")
            continue
        titulo = t.get("titulo", "")
        if not isinstance(titulo, str):
            titulo = str(titulo)
        prev = t.get("numPreguntas")
        if not isinstance(prev, int):
            try:
                prev = int(prev) if prev is not None else -1
            except (TypeError, ValueError):
                prev = -1

        path, modo = _resolver_archivo_tema(es_dir, tema_id)
        if path is None:
            log_global.append(f"ERROR tema '{tema_id}': no hay archivo ({modo})")
            filas.append(
                FilaAnalisis(
                    tema_id=tema_id,
                    titulo=titulo,
                    ruta_json="",
                    modo_resolucion=modo,
                    cuenta=-1,
                    num_preguntas_catalogo=prev,
                    coincide=False,
                    errores_estructura=["Sin archivo de preguntas"],
                )
            )
            continue

        usados.add(str(path.resolve()))
        if modo.startswith("legado"):
            adv = [modo]
        else:
            adv = []

        n, errs, warns = _analizar_archivo_json(path)
        adv.extend(warns)
        cuenta = n if n is not None else -1
        filas.append(
            FilaAnalisis(
                tema_id=tema_id,
                titulo=titulo,
                ruta_json=_ruta_relativa_o_abs(path, _raiz_script()),
                modo_resolucion=modo,
                cuenta=cuenta,
                num_preguntas_catalogo=prev,
                coincide=(n is not None and prev == n),
                errores_estructura=errs,
                advertencias=adv,
            )
        )
        if n is not None:
            conteo_por_id[tema_id] = n

    # Huérfanos: JSON en es/ no referenciado por ningún tema del catálogo
    todos_es = sorted(es_dir.glob("*.json"))
    huerfanos: List[str] = []
    for p in todos_es:
        if str(p.resolve()) not in usados:
            huerfanos.append(p.name)
    if huerfanos:
        log_global.append(
            "Archivos en temas/es/ no usados por ningún id del catálogo (huérfanos): "
            + str(len(huerfanos))
        )
        for name in huerfanos[:30]:
            log_global.append(f"  · {name}")
        if len(huerfanos) > 30:
            log_global.append(f"  … y {len(huerfanos) - 30} más")

    return filas, log_global, usados, conteo_por_id


def aplicar_conteos_a_temas_json(temas_json: Path, conteo_por_id: Dict[str, int]) -> Tuple[bool, str]:
    try:
        data = json.loads(temas_json.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        return False, str(e)
    temas = data.get("temas")
    if not isinstance(temas, list):
        return False, "'temas' no es lista"

    actualizados = 0
    for t in temas:
        if not isinstance(t, dict):
            continue
        tid = t.get("id")
        if isinstance(tid, str) and tid in conteo_por_id:
            nuevo = conteo_por_id[tid]
            if t.get("numPreguntas") != nuevo:
                t["numPreguntas"] = nuevo
                actualizados += 1

    try:
        temas_json.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    except OSError as e:
        return False, str(e)
    return True, f"Entradas tocadas: {actualizados}"


class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Clínicos — conteo preguntas → temas.json")
        self.geometry("960x640")
        self._es_dir = _raiz_script() / "temas" / "es"
        self._temas_json = _raiz_script() / "temas" / "temas.json"
        self._ultimas_filas: List[FilaAnalisis] = []
        self._ultimo_conteo: Dict[str, int] = {}

        frm_top = ttk.Frame(self, padding=8)
        frm_top.pack(fill=tk.X)
        ttk.Label(frm_top, text="Carpeta temas/es:").pack(side=tk.LEFT)
        self.var_es = tk.StringVar(value=str(self._es_dir))
        ttk.Entry(frm_top, textvariable=self.var_es, width=70).pack(side=tk.LEFT, padx=4, fill=tk.X, expand=True)
        ttk.Button(frm_top, text="…", width=3, command=self._pick_es).pack(side=tk.LEFT)
        ttk.Label(frm_top, text="temas.json:").pack(side=tk.LEFT, padx=(12, 0))
        self.var_temas = tk.StringVar(value=str(self._temas_json))
        ttk.Entry(frm_top, textvariable=self.var_temas, width=40).pack(side=tk.LEFT, padx=4)
        ttk.Button(frm_top, text="…", width=3, command=self._pick_temas).pack(side=tk.LEFT)

        frm_btn = ttk.Frame(self, padding=(8, 0))
        frm_btn.pack(fill=tk.X)
        ttk.Button(frm_btn, text="Analizar", command=self._analizar).pack(side=tk.LEFT)
        ttk.Button(frm_btn, text="Actualizar temas.json", command=self._guardar).pack(side=tk.LEFT, padx=8)

        split = ttk.Panedwindow(self, orient=tk.VERTICAL)
        split.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        tree_frame = ttk.Frame(split)
        cols = ("id", "titulo", "archivo", "modo", "cuenta", "catalogo", "ok", "problemas")
        self.tree = ttk.Treeview(tree_frame, columns=cols, show="headings", height=12)
        heads = {
            "id": "id",
            "titulo": "título",
            "archivo": "archivo",
            "modo": "resolución",
            "cuenta": "preguntas",
            "catalogo": "numPreguntas",
            "ok": "coincide",
            "problemas": "problemas",
        }
        wids = {"id": 140, "titulo": 180, "archivo": 220, "modo": 120, "cuenta": 70, "catalogo": 90, "ok": 60, "problemas": 200}
        for c in cols:
            self.tree.heading(c, text=heads[c])
            self.tree.column(c, width=wids[c], stretch=True)
        sb_y = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=sb_y.set)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb_y.pack(side=tk.RIGHT, fill=tk.Y)
        split.add(tree_frame, weight=3)

        log_frame = ttk.LabelFrame(split, text="Log", padding=4)
        self.log = scrolledtext.ScrolledText(log_frame, height=12, wrap=tk.WORD, font=("Consolas", 9))
        self.log.pack(fill=tk.BOTH, expand=True)
        split.add(log_frame, weight=2)

        self._log_line(
            "temas.json lista materias; cada tema tiene 'id' y 'numPreguntas'. "
            "La web carga temas/es/{id}_questions.json (content-paths.js)."
        )

    def _log_line(self, s: str) -> None:
        self.log.insert(tk.END, s + "\n")
        self.log.see(tk.END)

    def _pick_es(self) -> None:
        p = filedialog.askdirectory(initialdir=self.var_es.get())
        if p:
            self.var_es.set(p)

    def _pick_temas(self) -> None:
        p = filedialog.askopenfilename(
            initialdir=str(Path(self.var_temas.get()).parent),
            filetypes=[("JSON", "*.json"), ("Todos", "*.*")],
        )
        if p:
            self.var_temas.set(p)

    def _analizar(self) -> None:
        self.log.delete("1.0", tk.END)
        es_dir = Path(self.var_es.get().strip())
        temas_path = Path(self.var_temas.get().strip())
        for item in self.tree.get_children():
            self.tree.delete(item)

        if not es_dir.is_dir():
            self._log_line(f"ERROR: no es carpeta válida: {es_dir}")
            messagebox.showerror("Error", f"Carpeta inválida:\n{es_dir}")
            return

        try:
            filas, globales, _usados, conteo = ejecutar_analisis(es_dir, temas_path)
        except Exception:
            self._log_line(traceback.format_exc())
            messagebox.showerror("Error", traceback.format_exc())
            return

        self._ultimas_filas = filas
        self._ultimo_conteo = conteo

        for g in globales:
            self._log_line(g)

        err_count = 0
        for f in filas:
            probs: List[str] = []
            if f.errores_estructura:
                probs.extend(f.errores_estructura[:3])
                err_count += len(f.errores_estructura)
            if f.advertencias:
                probs.extend(f.advertencias[:2])
            prob_txt = "; ".join(probs)[:500]
            ok_txt = "sí" if f.coincide and f.cuenta >= 0 and not f.errores_estructura else "no"
            self.tree.insert(
                "",
                tk.END,
                values=(
                    f.tema_id,
                    (f.titulo[:40] + "…") if len(f.titulo) > 40 else f.titulo,
                    Path(f.ruta_json).name if f.ruta_json else "—",
                    f.modo_resolucion[:40] + "…" if len(f.modo_resolucion) > 40 else f.modo_resolucion,
                    f.cuenta if f.cuenta >= 0 else "—",
                    f.num_preguntas_catalogo,
                    ok_txt,
                    prob_txt,
                ),
            )

        resumen = (
            f"Temas en catálogo: {len(filas)}. "
            f"Con errores de estructura JSON/pregunta: {sum(1 for x in filas if x.errores_estructura)}. "
            f"numPreguntas distinto al conteo: {sum(1 for x in filas if x.cuenta >= 0 and not x.coincide)}."
        )
        self._log_line(resumen)
        if err_count:
            self._log_line(f"Total incidencias de validación en ítems: {err_count}")

    def _guardar(self) -> None:
        if not self._ultimo_conteo:
            messagebox.showwarning("Aviso", "Ejecuta primero «Analizar».")
            return
        temas_path = Path(self.var_temas.get().strip())
        if not messagebox.askyesno(
            "Confirmar",
            f"¿Sobrescribir numPreguntas en?\n{temas_path}\n\n"
            "Se respeta UTF-8 y formato indentado.",
        ):
            return
        ok, msg = aplicar_conteos_a_temas_json(temas_path, self._ultimo_conteo)
        if ok:
            self._log_line("Guardado OK: " + msg)
            messagebox.showinfo("Listo", msg)
            self._analizar()
        else:
            self._log_line("Error al guardar: " + msg)
            messagebox.showerror("Error", msg)


def main() -> None:
    app = App()
    app.mainloop()


if __name__ == "__main__":
    main()
