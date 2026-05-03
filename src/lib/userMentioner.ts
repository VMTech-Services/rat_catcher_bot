
/**
 * This allows to mention user with universal data parsing for both users with @username or without it. 
 * 
 * @param userData 
 * @returns 
 */
export default function mention(userData: { username: string, id: number }) {
    if (userData.username.startsWith("@")) {
        return userData.username
    } else {
        return `<a href="tg://user?id=${userData.id}">${userData.username}</a>`
    }
}