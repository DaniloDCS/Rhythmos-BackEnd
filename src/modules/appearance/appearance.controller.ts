import type { Response } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";

const SETTINGS_COLLECTION = "platform_settings";
const APPEARANCE_DOCUMENT = "appearance";
const THEMES_COLLECTION = "platform_themes";
const LEGACY_THEME_ID = "default";
const DEFAULT_PRESET_ID = "ebserh";
const PRESET_THEMES_VERSION = 1;

export const DEFAULT_APPEARANCE = {
  name: "Rhythmos",
  colors: {
    primary: "#00587c",
    textOnWhite: "#00587c",
    textOnPrimary: "#ffffff",
    light1: "#0077a6",
    light2: "#00a0c6",
    hover: "#004a68",
    border: "rgba(0, 88, 124, 0.2)",
    shadow: "0 10px 30px rgba(0, 88, 124, 0.18)",
    accent1: "#006f9a",
    accent2: "#0089b8",
    accent3: "#00a9d6",
    button: "#0077a6",
    buttonHover: "#00a0c6",
    buttonWhite: "#ffffff",
    buttonWhiteHover: "#ebfbff",
    cancel: "#0c4a6e",
    cancelHover: "#0284c7",
  },
};

type AppearanceColor = keyof typeof DEFAULT_APPEARANCE.colors;
type AppearanceColors = Record<AppearanceColor, string>;

type ThemeInput = {
  name: string;
  colors: AppearanceColors;
};

type PresetTheme = ThemeInput & {
  id: string;
};

const PRESET_THEMES: PresetTheme[] = [
  {
    id: "navy",
    name: "Navy",
    colors: {
      primary: "#041434",
      textOnWhite: "#041434",
      textOnPrimary: "#f8fafc",
      light1: "#0b224f",
      light2: "#18386d",
      hover: "#0b224f",
      border: "rgba(4, 20, 52, 0.18)",
      shadow: "0 10px 30px rgba(4, 20, 52, 0.22)",
      accent1: "#061a3d",
      accent2: "#07224f",
      accent3: "#091f3f",
      button: "#18386d",
      buttonHover: "#244b8d",
      buttonWhite: "#ffffff",
      buttonWhiteHover: "#e9eef8",
      cancel: "#334155",
      cancelHover: "#475569",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    colors: {
      primary: "#064468",
      textOnWhite: "#064468",
      textOnPrimary: "#f8fafc",
      light1: "#0a5a88",
      light2: "#1172aa",
      hover: "#0a5a88",
      border: "rgba(6, 68, 104, 0.18)",
      shadow: "0 10px 30px rgba(6, 68, 104, 0.22)",
      accent1: "#07527c",
      accent2: "#053d5e",
      accent3: "#0b6fa3",
      button: "#1172aa",
      buttonHover: "#1690d6",
      buttonWhite: "#ffffff",
      buttonWhiteHover: "#e6f7ff",
      cancel: "#155e75",
      cancelHover: "#0ea5e9",
    },
  },
  {
    id: "electric",
    name: "Electric",
    colors: {
      primary: "#235add",
      textOnWhite: "#1d4ed8",
      textOnPrimary: "#ffffff",
      light1: "#4a7df0",
      light2: "#7aa2ff",
      hover: "#1d4ed8",
      border: "rgba(35, 90, 221, 0.18)",
      shadow: "0 10px 30px rgba(35, 90, 221, 0.25)",
      accent1: "#1e4fd1",
      accent2: "#1a43b3",
      accent3: "#2b6df0",
      button: "#235add",
      buttonHover: "#4a7df0",
      buttonWhite: "#ffffff",
      buttonWhiteHover: "#edf3ff",
      cancel: "#334155",
      cancelHover: "#475569",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    colors: {
      primary: "#06a86d",
      textOnWhite: "#047857",
      textOnPrimary: "#ffffff",
      light1: "#10c985",
      light2: "#4ce0a8",
      hover: "#059669",
      border: "rgba(6, 168, 109, 0.18)",
      shadow: "0 10px 30px rgba(6, 168, 109, 0.22)",
      accent1: "#058a5a",
      accent2: "#046e48",
      accent3: "#07b774",
      button: "#06a86d",
      buttonHover: "#10c985",
      buttonWhite: "#ffffff",
      buttonWhiteHover: "#e9fff6",
      cancel: "#166534",
      cancelHover: "#16a34a",
    },
  },
  {
    id: "danger",
    name: "Danger",
    colors: {
      primary: "#e11d48",
      textOnWhite: "#9f1239",
      textOnPrimary: "#ffffff",
      light1: "#fb7185",
      light2: "#fecdd3",
      hover: "#be123c",
      border: "rgba(225, 29, 72, 0.18)",
      shadow: "0 10px 30px rgba(225, 29, 72, 0.18)",
      accent1: "#c81d4f",
      accent2: "#a3183f",
      accent3: "#e02a5a",
      button: "#e11d48",
      buttonHover: "#fb4b72",
      buttonWhite: "#ffffff",
      buttonWhiteHover: "#fff1f4",
      cancel: "#881337",
      cancelHover: "#be123c",
    },
  },
  {
    id: "slate",
    name: "Slate",
    colors: {
      primary: "#2c2f33",
      textOnWhite: "#2c2f33",
      textOnPrimary: "#f8fafc",
      light1: "#3a3f46",
      light2: "#4a515a",
      hover: "#3a3f46",
      border: "rgba(44, 47, 51, 0.25)",
      shadow: "0 10px 30px rgba(44, 47, 51, 0.35)",
      accent1: "#2a2e33",
      accent2: "#23272c",
      accent3: "#353a41",
      button: "#4a515a",
      buttonHover: "#5f6772",
      buttonWhite: "#ffffff",
      buttonWhiteHover: "#f2f4f7",
      cancel: "#3f3f46",
      cancelHover: "#52525b",
    },
  },
  {
    id: "moss",
    name: "Moss",
    colors: {
      primary: "#4d7358",
      textOnWhite: "#2f4a38",
      textOnPrimary: "#f8fafc",
      light1: "#5f8a6d",
      light2: "#7fb18d",
      hover: "#3f5f48",
      border: "rgba(77, 115, 88, 0.22)",
      shadow: "0 10px 30px rgba(77, 115, 88, 0.25)",
      accent1: "#3f5f48",
      accent2: "#36513e",
      accent3: "#4f7a5c",
      button: "#5f8a6d",
      buttonHover: "#79aa88",
      buttonWhite: "#ffffff",
      buttonWhiteHover: "#f0fff4",
      cancel: "#3f5f48",
      cancelHover: "#5f8a6d",
    },
  },
  {
    id: "amber",
    name: "Amber",
    colors: {
      primary: "#d97706",
      textOnWhite: "#78350f",
      textOnPrimary: "#ffffff",
      light1: "#fbbf24",
      light2: "#fcd34d",
      hover: "#b45309",
      border: "rgba(217, 119, 6, 0.18)",
      shadow: "0 10px 30px rgba(217, 119, 6, 0.22)",
      accent1: "#c46a05",
      accent2: "#a85a04",
      accent3: "#e07b0a",
      button: "#d97706",
      buttonHover: "#f59e0b",
      buttonWhite: "#ffffff",
      buttonWhiteHover: "#fff8eb",
      cancel: "#92400e",
      cancelHover: "#d97706",
    },
  },
  {
    id: "slateblue",
    name: "Slate Blue",
    colors: {
      primary: "#475569",
      textOnWhite: "#1e293b",
      textOnPrimary: "#f8fafc",
      light1: "#64748b",
      light2: "#94a3b8",
      hover: "#334155",
      border: "rgba(71, 85, 105, 0.25)",
      shadow: "0 10px 30px rgba(71, 85, 105, 0.22)",
      accent1: "#3d4f63",
      accent2: "#2f3e4f",
      accent3: "#556a83",
      button: "#64748b",
      buttonHover: "#8393ac",
      buttonWhite: "#ffffff",
      buttonWhiteHover: "#f1f5f9",
      cancel: "#334155",
      cancelHover: "#64748b",
    },
  },
  {
    id: "purple",
    name: "Purple",
    colors: {
      primary: "#7c3aed",
      textOnWhite: "#5b21b6",
      textOnPrimary: "#f8fafc",
      light1: "#8b5cf6",
      light2: "#a78bfa",
      hover: "#6d28d9",
      border: "rgba(124, 58, 237, 0.22)",
      shadow: "0 10px 30px rgba(124, 58, 237, 0.25)",
      accent1: "#6b21d6",
      accent2: "#581bb3",
      accent3: "#7f3ff0",
      button: "#7c3aed",
      buttonHover: "#9b63ff",
      buttonWhite: "#ffffff",
      buttonWhiteHover: "#f5f0ff",
      cancel: "#581c87",
      cancelHover: "#7c3aed",
    },
  },
  {
    id: "ebserh",
    name: "EBSERH",
    colors: { ...DEFAULT_APPEARANCE.colors },
  },
];

const colorKeys = Object.keys(DEFAULT_APPEARANCE.colors) as AppearanceColor[];
const cssValueKeys = new Set<AppearanceColor>(["border", "shadow"]);
const validHexColor = /^#[0-9a-f]{6}$/i;
const unsafeCssValue = /[;{}]|url\s*\(/i;

const appearanceRef = () =>
  db.collection(SETTINGS_COLLECTION).doc(APPEARANCE_DOCUMENT);

const themesRef = () => db.collection(THEMES_COLLECTION);
const themeRef = (themeId: string) => themesRef().doc(themeId);

const serializeAppearance = (data?: Record<string, any>) => ({
  ...DEFAULT_APPEARANCE,
  ...(data ?? {}),
  colors: {
    ...DEFAULT_APPEARANCE.colors,
    ...(data?.colors ?? {}),
  },
});

const validateCssValue = (key: AppearanceColor, value: string) => {
  if (!value || value.length > 120 || unsafeCssValue.test(value)) {
    throw new Error(`O valor CSS de ${key} é inválido.`);
  }

  return value;
};

const validateTheme = (body: Record<string, any> | undefined): ThemeInput => {
  const name = String(body?.name ?? "").trim();
  const submittedColors = body?.colors ?? {};

  if (!name || name.length > 60) {
    throw new Error("Informe um nome de tema com até 60 caracteres.");
  }

  const colors = colorKeys.reduce((result, key) => {
    const value = String(submittedColors[key] ?? "").trim();

    if (cssValueKeys.has(key)) {
      result[key] = validateCssValue(key, value);
      return result;
    }

    if (!validHexColor.test(value)) {
      throw new Error(`A cor ${key} deve estar no formato hexadecimal.`);
    }

    result[key] = value.toLowerCase();
    return result;
  }, {} as AppearanceColors);

  return { name, colors };
};

const timestampToIso = (value: any) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
};

const serializeTheme = (
  id: string,
  data: Record<string, any> | undefined,
  activeThemeId: string,
) => {
  const appearance = serializeAppearance(data);

  return {
    id,
    name: appearance.name,
    colors: appearance.colors,
    isActive: id === activeThemeId,
    builtIn: Boolean(data?.builtIn),
    createdAt: timestampToIso(data?.createdAt),
    updatedAt: timestampToIso(data?.updatedAt),
    createdBy: data?.createdBy ?? null,
    updatedBy: data?.updatedBy ?? null,
  };
};

const ensurePresetThemes = async (settingsData: Record<string, any>) => {
  if (Number(settingsData.presetThemesVersion ?? 0) >= PRESET_THEMES_VERSION) {
    return;
  }

  const snapshots = await Promise.all(
    PRESET_THEMES.map((preset) => themeRef(preset.id).get()),
  );

  const missing = PRESET_THEMES.filter((_, index) => !snapshots[index].exists);

  if (missing.length > 0) {
    const batch = db.batch();

    for (const preset of missing) {
      batch.set(themeRef(preset.id), {
        name: preset.name,
        colors: preset.colors,
        builtIn: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: null,
        updatedBy: null,
      });
    }

    await batch.commit();
  }

  await appearanceRef().set(
    { presetThemesVersion: PRESET_THEMES_VERSION },
    { merge: true },
  );
};

/**
 * Mantém instalações antigas intactas e adiciona os temas predefinidos.
 * Se já existir um activeThemeId válido, ele continua sendo usado.
 */
const ensureActiveTheme = async () => {
  const settingsSnapshot = await appearanceRef().get();
  const settingsData = settingsSnapshot.data() ?? {};

  await ensurePresetThemes(settingsData);

  const configuredActiveThemeId = String(
    settingsData.activeThemeId ?? "",
  ).trim();

  if (configuredActiveThemeId) {
    const configuredThemeSnapshot = await themeRef(
      configuredActiveThemeId,
    ).get();

    if (configuredThemeSnapshot.exists) {
      return {
        activeThemeId: configuredActiveThemeId,
        snapshot: configuredThemeSnapshot,
      };
    }
  }

  const hasLegacyAppearance = Boolean(settingsData.name || settingsData.colors);

  if (hasLegacyAppearance) {
    const legacyAppearance = serializeAppearance(settingsData);
    const legacyRef = themeRef(LEGACY_THEME_ID);
    const legacySnapshot = await legacyRef.get();

    if (!legacySnapshot.exists) {
      await legacyRef.set({
        name: legacyAppearance.name,
        colors: legacyAppearance.colors,
        builtIn: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: null,
        updatedBy: null,
      });
    }

    const resolvedLegacySnapshot = await legacyRef.get();
    const resolvedAppearance = serializeAppearance(
      resolvedLegacySnapshot.data(),
    );

    await appearanceRef().set(
      {
        activeThemeId: LEGACY_THEME_ID,
        name: resolvedAppearance.name,
        colors: resolvedAppearance.colors,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      activeThemeId: LEGACY_THEME_ID,
      snapshot: resolvedLegacySnapshot,
    };
  }

  const presetSnapshot = await themeRef(DEFAULT_PRESET_ID).get();
  const presetAppearance = serializeAppearance(presetSnapshot.data());

  await appearanceRef().set(
    {
      activeThemeId: DEFAULT_PRESET_ID,
      name: presetAppearance.name,
      colors: presetAppearance.colors,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: null,
    },
    { merge: true },
  );

  return {
    activeThemeId: DEFAULT_PRESET_ID,
    snapshot: presetSnapshot,
  };
};

const syncActiveAppearance = async (
  themeId: string,
  theme: ThemeInput,
  userId?: string,
) => {
  await appearanceRef().set(
    {
      activeThemeId: themeId,
      name: theme.name,
      colors: theme.colors,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: userId ?? null,
    },
    { merge: true },
  );
};

export const getAppearance = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { snapshot } = await ensureActiveTheme();
    const appearance = serializeAppearance(snapshot.data());

    return res.json({
      name: appearance.name,
      colors: appearance.colors,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Não foi possível carregar a aparência da plataforma.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Retorna um tema específico para aplicação no cliente.
 * A rota é pública porque contém somente identidade visual.
 */
export const getThemeById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    // Garante que os presets já existam antes da consulta.
    await ensureActiveTheme();

    const rawThemeId = String(req.params.id ?? "").trim();

    if (!rawThemeId) {
      return res.status(400).json({
        message: "Informe o tema que deseja carregar.",
      });
    }

    const candidates = Array.from(
      new Set([rawThemeId.replace(/^theme-/i, ""), rawThemeId]),
    ).filter(Boolean);

    for (const themeId of candidates) {
      const snapshot = await themeRef(themeId).get();

      if (!snapshot.exists) continue;

      const appearance = serializeAppearance(snapshot.data());

      return res.json({
        id: snapshot.id,
        name: appearance.name,
        colors: appearance.colors,
      });
    }

    return res.status(404).json({
      message: "Tema não encontrado.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Não foi possível carregar o tema.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getThemes = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { activeThemeId } = await ensureActiveTheme();
    const snapshot = await themesRef().get();

    const themes = snapshot.docs
      .map((doc) => serializeTheme(doc.id, doc.data(), activeThemeId))
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        if (a.builtIn !== b.builtIn) return a.builtIn ? -1 : 1;
        return a.name.localeCompare(b.name, "pt-BR");
      });

    return res.json(themes);
  } catch (error) {
    return res.status(500).json({
      message: "Não foi possível carregar os temas.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const createTheme = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureActiveTheme();
    const theme = validateTheme(req.body);
    const newThemeRef = themesRef().doc();

    await newThemeRef.set({
      ...theme,
      builtIn: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: req.user?.uid ?? null,
      updatedBy: req.user?.uid ?? null,
    });

    return res.status(201).json({
      id: newThemeRef.id,
      ...theme,
      isActive: false,
      builtIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível criar o tema.",
    });
  }
};

export const updateTheme = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const themeId = String(req.params.id ?? "").trim();
    const currentThemeRef = themeRef(themeId);
    const snapshot = await currentThemeRef.get();

    if (!snapshot.exists) {
      return res.status(404).json({ message: "Tema não encontrado." });
    }

    const theme = validateTheme(req.body);

    await currentThemeRef.set(
      {
        ...theme,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: req.user?.uid ?? null,
      },
      { merge: true },
    );

    const { activeThemeId } = await ensureActiveTheme();
    const isActive = activeThemeId === themeId;

    if (isActive) {
      await syncActiveAppearance(themeId, theme, req.user?.uid);
    }

    return res.json({
      id: themeId,
      ...theme,
      isActive,
      builtIn: Boolean(snapshot.data()?.builtIn),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o tema.",
    });
  }
};

export const activateTheme = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const themeId = String(req.params.id ?? "").trim();
    const snapshot = await themeRef(themeId).get();

    if (!snapshot.exists) {
      return res.status(404).json({ message: "Tema não encontrado." });
    }

    const theme = serializeAppearance(snapshot.data());

    await syncActiveAppearance(
      themeId,
      { name: theme.name, colors: theme.colors },
      req.user?.uid,
    );

    await themeRef(themeId).set(
      {
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: req.user?.uid ?? null,
      },
      { merge: true },
    );

    return res.json({
      id: themeId,
      name: theme.name,
      colors: theme.colors,
      isActive: true,
      builtIn: Boolean(snapshot.data()?.builtIn),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível ativar o tema.",
    });
  }
};

export const deleteTheme = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const themeId = String(req.params.id ?? "").trim();
    const { activeThemeId } = await ensureActiveTheme();

    if (themeId === activeThemeId) {
      return res.status(409).json({
        message:
          "O tema ativo não pode ser excluído. Ative outro tema primeiro.",
      });
    }

    const snapshot = await themeRef(themeId).get();

    if (!snapshot.exists) {
      return res.status(404).json({ message: "Tema não encontrado." });
    }

    if (snapshot.data()?.builtIn) {
      return res.status(409).json({
        message: "Os temas predefinidos da plataforma não podem ser excluídos.",
      });
    }

    await themeRef(themeId).delete();
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o tema.",
    });
  }
};

/**
 * Compatibilidade com o PUT /admin/appearance antigo:
 * agora ele edita o tema que estiver ativo.
 */
export const updateAppearance = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const theme = validateTheme(req.body);
    const { activeThemeId } = await ensureActiveTheme();
    const activeSnapshot = await themeRef(activeThemeId).get();

    await themeRef(activeThemeId).set(
      {
        ...theme,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: req.user?.uid ?? null,
      },
      { merge: true },
    );

    await syncActiveAppearance(activeThemeId, theme, req.user?.uid);

    return res.json({
      id: activeThemeId,
      ...theme,
      isActive: true,
      builtIn: Boolean(activeSnapshot.data()?.builtIn),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a aparência.",
    });
  }
};
