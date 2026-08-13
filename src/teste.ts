// import { Request, Response } from "express";
// import { db } from "./config/firebase";
// import { Trail } from "./models/Trails";
// import { Module } from "./models/Module";
// import { Lesson } from "./models/Lesson";

// export const createFullTrail = async (_: Request, res: Response) => {
//   try {
//     const trailRef = db.collection("trails").doc();
//     const trailId = trailRef.id;

//     const trail = new Trail({
//       id: trailId,
//       title: "Trilha Exemplo",
//       description: "Trilha criada automaticamente com módulos e aulas",
//     });

//     await trailRef.set(trail.toObject());

//     for (let m = 1; m <= 4; m++) {
//       const moduleRef = db.collection("modules").doc();
//       const moduleId = moduleRef.id;

//       const module = new Module({
//         id: moduleId,
//         trailId,
//         title: `Módulo ${m}`,
//         description: `Descrição do módulo ${m}`,
//         sequence: m,
//       });

//       await moduleRef.set(module.toObject());

//       for (let c = 1; c <= 6; c++) {
//         const classRef = db.collection("lessons").doc();
//         const classId = classRef.id;

//         const classItem = new Lesson({
//           id: classId,
//           moduleId,
//           title: `Aula ${c} do módulo ${m}`,
//           content: [
//             { type: "Título", content: "Título do bloco", id: "2" },
//             {
//               type: "Parágrafo",
//               content: "Este é um parágrafo de teste.",
//               id: "1",
//             },
//           ],
//           sequence: c,
//         });

//         await classRef.set(classItem.toObject());
//       }
//     }

//     return res.status(201).json({
//       message: "Trilha criada com sucesso!",
//       trailId,
//       modules: 4,
//       lessonsPerModule: 6,
//     });
//   } catch (err) {
//     console.error("Erro ao criar trilha completa:", err);
//     return res.status(500).json({ error: "Erro ao criar trilha completa" });
//   }
// };
