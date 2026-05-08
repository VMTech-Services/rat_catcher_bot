export interface DateFormatOptions {
    /** Показывать ли дату целиком? (по умолчанию true) */
    showDate?: boolean;
    /** Показывать ли время целиком? (по умолчанию true) */
    showTime?: boolean;

    // --- Части даты ---
    /** Показывать день? (по умолчанию true) */
    day?: boolean;
    /** Показывать месяц? (по умолчанию true) */
    month?: boolean;
    /** Показывать год? (по умолчанию true) */
    year?: boolean;

    // --- Части времени ---
    /** Показывать часы? (по умолчанию true) */
    hours?: boolean;
    /** Показывать минуты? (по умолчанию true) */
    minutes?: boolean;
    /** Показывать секунды? (по умолчанию true) */
    seconds?: boolean;
}

/**
 * Форматирует дату с возможностью отключения любых ее частей.
 * @param date Объект Date, число (timestamp) или строка
 * @param options Настройки отображения
 * @returns Отформатированная строка
 */
export function formatDate(date: Date | number | string, options?: DateFormatOptions): string {
    const d = new Date(date);

    // Значения по умолчанию (всё включено)
    const opts: Required<DateFormatOptions> = {
        showDate: true,
        showTime: true,
        day: true,
        month: true,
        year: true,
        hours: true,
        minutes: true,
        seconds: true,
        ...options
    };

    // Вспомогательная функция для добавления ведущего нуля (5 -> "05")
    const pad = (num: number) => num.toString().padStart(2, '0');

    const resultParts: string[] = [];

    // --- БЛОК ДАТЫ ---
    if (opts.showDate) {
        const dateComponents: string[] = [];
        if (opts.day) dateComponents.push(pad(d.getDate()));
        if (opts.month) dateComponents.push(pad(d.getMonth() + 1)); // Месяцы начинаются с 0
        if (opts.year) dateComponents.push(d.getFullYear().toString());

        if (dateComponents.length > 0) {
            resultParts.push(dateComponents.join('.')); // Разделитель даты: 08.05.2026
        }
    }

    // --- БЛОК ВРЕМЕНИ ---
    if (opts.showTime) {
        const timeComponents: string[] = [];
        if (opts.hours) timeComponents.push(pad(d.getHours()));
        if (opts.minutes) timeComponents.push(pad(d.getMinutes()));
        if (opts.seconds) timeComponents.push(pad(d.getSeconds()));

        if (timeComponents.length > 0) {
            resultParts.push(timeComponents.join(':')); // Разделитель времени: 19:45:00
        }
    }

    // Соединяем дату и время пробелом
    return resultParts.join(' ');
}