export type ToastVariant = "default" | "destructive" | "success";

type ToastMessage = {
    title: string;
    description?: string;
    variant?: ToastVariant;
};

const formatName = (first?: string, last?: string) => {
    const name = `${first ?? ""} ${last ?? ""}`.trim();
    return name || undefined;
};

export const notifications = {
    authRequired: (): ToastMessage => ({
        title: "Требуется авторизация",
        description: "Пожалуйста, сначала войдите.",
        variant: "destructive",
    }),
    characterCreated: (first?: string, last?: string): ToastMessage => ({
        title: "Персонаж создан",
        description: formatName(first, last) || "Персонаж успешно создан.",
        variant: "success",
    }),
    characterUpdated: (first?: string, last?: string): ToastMessage => ({
        title: "Персонаж обновлен",
        description: formatName(first, last) || "Персонаж успешно обновлен.",
        variant: "success",
    }),
    characterSaveFailed: (message?: string): ToastMessage => ({
        title: "Не удалось сохранить персонажа",
        description: message || "Попробуйте еще раз.",
        variant: "destructive",
    }),
    charactersLoadFailed: (): ToastMessage => ({
        title: "Не удалось загрузить персонажей",
        description: "Обновите страницу и попробуйте снова.",
        variant: "destructive",
    }),
};
