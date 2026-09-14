/** The first login's credentials, for a caller that wants a single login. */
export async function firstCredentials(logins) {
    return (await logins)[0]?.credentials ?? null;
}
//# sourceMappingURL=base.js.map