import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import type { IBlock } from "../interfaces/Block.interface";

const LESSONS = "lessons";
const POLLS = "lesson_polls";

const pollError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

const pollId = (lessonId: string, versionId: string, blockId: string) =>
  `${lessonId}_${versionId}_${blockId}`;

export class PollService {
  private static async getBlock(
    lessonId: string,
    versionId: string,
    blockId: string,
  ) {
    const version = await db
      .collection(LESSONS)
      .doc(lessonId)
      .collection("versions")
      .doc(versionId)
      .get();
    if (!version.exists) throw pollError(404, "Versão da aula não encontrada.");

    const content = (version.data()?.content ?? []) as Array<
      IBlock | Record<string, unknown>
    >;
    const rawBlock = content.find((item) => String(item.id ?? "") === blockId);
    if (!rawBlock || rawBlock.type !== "Enquete") {
      throw pollError(404, "Enquete não encontrada nesta versão da aula.");
    }

    const rawContent =
      typeof rawBlock.content === "object" && rawBlock.content !== null
        ? (rawBlock.content as {
            question?: unknown;
            multiple?: unknown;
            options?: unknown[];
            showResultsAfterVote?: unknown;
          })
        : {};

    const options = Array.isArray(rawContent.options)
      ? rawContent.options.map((option, index) =>
          typeof option === "string"
            ? { id: `${blockId}-option-${index + 1}`, text: option }
            : {
                id:
                  typeof (option as { id?: unknown })?.id === "string" &&
                  (option as { id: string }).id
                    ? (option as { id: string }).id
                    : `${blockId}-option-${index + 1}`,
                text:
                  typeof (option as { text?: unknown })?.text === "string"
                    ? (option as { text: string }).text
                    : "",
              },
        )
      : [];

    return {
      id: blockId,
      type: "Enquete" as const,
      content: {
        question:
          typeof rawContent.question === "string" ? rawContent.question : "",
        multiple: Boolean(rawContent.multiple),
        options,
        showResultsAfterVote:
          rawContent.showResultsAfterVote === undefined
            ? true
            : Boolean(rawContent.showResultsAfterVote),
      },
    };
  }

  static async getState(input: {
    lessonId: string;
    versionId: string;
    blockId: string;
    userId: string;
  }) {
    const block = await this.getBlock(input.lessonId, input.versionId, input.blockId);
    const id = pollId(input.lessonId, input.versionId, input.blockId);
    const ref = db.collection(POLLS).doc(id);
    const [pollSnapshot, responseSnapshot] = await Promise.all([
      ref.get(),
      ref.collection("responses").doc(input.userId).get(),
    ]);

    const aggregate = pollSnapshot.data() ?? {};
    const selectedOptionIds = responseSnapshot.exists
      ? (responseSnapshot.data()?.optionIds ?? [])
      : [];
    const canShowResults =
      block.content.showResultsAfterVote !== false && responseSnapshot.exists;

    return {
      totalResponses: Number(aggregate.totalResponses ?? 0),
      optionCounts: canShowResults ? aggregate.optionCounts ?? {} : {},
      selectedOptionIds,
      canShowResults,
    };
  }

  static async vote(input: {
    lessonId: string;
    versionId: string;
    blockId: string;
    userId: string;
    optionIds: unknown;
  }) {
    const block = await this.getBlock(input.lessonId, input.versionId, input.blockId);
    const validOptionIds = new Set(block.content.options.map((option) => option.id));
    const optionIds = Array.isArray(input.optionIds)
      ? [...new Set(input.optionIds.map(String).filter((id) => validOptionIds.has(id)))]
      : [];

    if (!optionIds.length) throw pollError(400, "Selecione pelo menos uma opção.");
    if (!block.content.multiple && optionIds.length > 1) {
      throw pollError(400, "Esta enquete aceita apenas uma resposta.");
    }

    const id = pollId(input.lessonId, input.versionId, input.blockId);
    const ref = db.collection(POLLS).doc(id);
    const responseRef = ref.collection("responses").doc(input.userId);
    const now = Timestamp.now();

    await db.runTransaction(async (transaction) => {
      const [pollSnapshot, responseSnapshot] = await Promise.all([
        transaction.get(ref),
        transaction.get(responseRef),
      ]);

      const previous = responseSnapshot.exists
        ? ((responseSnapshot.data()?.optionIds ?? []) as string[])
        : [];
      const counts: Record<string, number> = {
        ...(pollSnapshot.data()?.optionCounts ?? {}),
      };

      for (const previousId of previous) {
        counts[previousId] = Math.max(0, Number(counts[previousId] ?? 0) - 1);
      }
      for (const selectedId of optionIds) {
        counts[selectedId] = Number(counts[selectedId] ?? 0) + 1;
      }

      transaction.set(
        ref,
        {
          id,
          lessonId: input.lessonId,
          versionId: input.versionId,
          blockId: input.blockId,
          totalResponses: responseSnapshot.exists
            ? Number(pollSnapshot.data()?.totalResponses ?? 0)
            : Number(pollSnapshot.data()?.totalResponses ?? 0) + 1,
          optionCounts: counts,
          createdAt: pollSnapshot.data()?.createdAt ?? now,
          updatedAt: now,
        },
        { merge: true },
      );

      transaction.set(
        responseRef,
        {
          userId: input.userId,
          optionIds,
          createdAt: responseSnapshot.data()?.createdAt ?? now,
          updatedAt: now,
        },
        { merge: true },
      );
    });

    return this.getState({
      lessonId: input.lessonId,
      versionId: input.versionId,
      blockId: input.blockId,
      userId: input.userId,
    });
  }
}

export const getPollErrorStatus = (error: unknown) =>
  error instanceof Error &&
  "status" in error &&
  typeof (error as Error & { status?: unknown }).status === "number"
    ? (error as Error & { status: number }).status
    : 500;
