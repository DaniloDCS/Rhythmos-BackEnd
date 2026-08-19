# Clinical — backend Rhythmos

## Onde copiar

Copie a pasta `Clinical` para:

`backend/src/modules/Clinical`

## Registrar no routes.ts

```ts
import ClinicalRoutes from "./modules/Clinical/clinical.routes";

// ...
router.use(ClinicalRoutes);
```

**Não** use `router.use("/clinical-cases", ClinicalRoutes)`, porque as rotas já possuem o caminho completo.

## Endpoints do usuário

- `GET /clinical-cases`
- `POST /clinical-cases/:id/answer`

Ambos usam `verifyFirebaseToken`.

O POST recebe:

```json
{
  "analysis": {
    "calibration": "25 mm/s e 10 mm/mV",
    "rhythm": "regular",
    "heart-rate": "78 bpm",
    "p-wave": "presente",
    "pr-interval": "normal",
    "qrs": "estreito",
    "axis": "normal",
    "st-segment": "isoelétrico",
    "t-wave": "normal",
    "qt-qtc": "normal"
  },
  "answer": "Ritmo sinusal"
}
```

## Endpoints administrativos

- `GET /admin/clinical-cases/stats`
- `GET /admin/clinical-cases`
- `POST /admin/clinical-cases`
- `GET /admin/clinical-cases/:id`
- `GET /admin/clinical-cases/:id/attempts`
- `PUT /admin/clinical-cases/:id`
- `PATCH /admin/clinical-cases/:id`
- `PATCH /admin/clinical-cases/:id/status`
- `DELETE /admin/clinical-cases/:id`

## Collections

- `clinical_cases`: conteúdo criado pelo administrador
- `clinical_case_attempts`: histórico de todas as tentativas
- `clinical_case_progress`: conclusão única por usuário/caso

O ID do progresso é determinístico: `userId__caseId`. Isso impede XP duplicado.

## XP

Primeira conclusão correta: `+100 XP`.

O módulo atualiza:

- `user_progress.xp`
- `user_progress.level`
- `user_progress.levels`
- `user_progress.streak`
- `user_progress.stats.simulationsCompleted`

Esta versão não depende do `RewardService`, justamente para ficar compatível com o núcleo atual do backend. Recompensas de level-up podem ser reintegradas depois sem bloquear o Clinical.

## Status

- `rascunho`
- `publicado`
- `arquivado`

Somente `publicado` aparece em `GET /clinical-cases`.

## Passos de análise

`analysisSteps: []` faz o backend e o front usarem os mesmos 10 passos padrão. Também é possível cadastrar exatamente 10 passos personalizados.
