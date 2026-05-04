export function pluralize(number: number, titles: [string, string, string]): string {
    const cases = [2, 0, 1, 1, 1, 2];
    const index = (number % 100 > 4 && number % 100 < 20)
        ? 2
        : cases[(number % 10 < 5) ? number % 10 : 5];

    return titles[index];
}

export const ratForms: [string, string, string] = ["крыса", "крысы", "крыс"];
export const participantForms: [string, string, string] = ["участник", "участника", "участников"];
export const userForms: [string, string, string] = ["пользователь", "пользователя", "пользователей"];