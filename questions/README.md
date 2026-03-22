# Sistema de Preguntas Multiidioma

## Estructura de Carpetas

```
questions/
├── es/                     # Preguntas en español
│   ├── categories/        # Preguntas por categoría
│   │   ├── anatomia_questions.json
│   │   ├── cardiologia_questions.json
│   │   └── ...
│   ├── topics/           # Preguntas por tema de estudio
│   │   ├── asma_bronquial_questions.json
│   │   ├── diabetes_mellitus_questions.json
│   │   └── ...
│   └── true_false/       # Preguntas de verdadero/falso
│       └── true_false_general_questions.json
│
└── en/                     # Preguntas en inglés
    ├── categories/        # Categorías en inglés
    │   ├── anatomia_questions.json
    │   ├── cardiologia_questions.json
    │   └── ...
    ├── topics/           # Temas en inglés
    │   ├── asma_bronquial_questions.json
    │   ├── diabetes_mellitus_questions.json
    │   └── ...
    └── true_false/       # Verdadero/falso en inglés
        └── true_false_general_questions.json
```

## Formato de Archivos

### Preguntas de Categoría y Tema
```json
[
  {
    "question": "Pregunta",
    "options": [
      "Opción 1",
      "Opción 2",
      "Opción 3",
      "Opción 4"
    ],
    "correctAnswer": 1,
    "explanation": "Explicación"
  }
]
```

### Preguntas de Verdadero/Falso
```json
[
  {
    "question": "Pregunta",
    "isTrue": true,
    "explanation": "Explicación"
  }
]
```

## Sistema de Respaldo

El sistema busca los archivos en este orden:
1. Idioma seleccionado por el usuario
2. Inglés (respaldo primario)
3. Español (respaldo secundario)

## Agregar Nuevos Idiomas

1. Crear una nueva carpeta con el código del idioma (ej: `fr/` para francés)
2. Replicar la estructura de subcarpetas:
   - `categories/`
   - `topics/`
   - `true_false/`
3. Agregar el idioma en `LanguageManager.supportedLanguages`

## Mantenimiento

### Agregar Nuevas Preguntas
1. Agregar primero en la carpeta del idioma principal (`es/`)
2. Usar las utilidades para crear archivos vacíos en otros idiomas:
   ```kotlin
   QuestionManager.createEmptyFile(context, "categoria", "en")
   ```

### Verificar Traducciones Faltantes
```kotlin
// Para categorías
QuestionPreferences.getCategoriesNeedingTranslation(context)

// Para temas
QuestionManager.getTopicsNeedingTranslation(context)

// Para verdadero/falso
TrueFalseJsonUtil.getFilesNeedingTranslation(context)
```

## Notas Importantes

- Mantener los nombres de archivo consistentes entre idiomas
- No cambiar la estructura de las preguntas (mantener el mismo número de opciones)
- Asegurarse de que las explicaciones sean claras en cada idioma
- Mantener el mismo valor de `correctAnswer` entre idiomas
