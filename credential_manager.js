class CredentialsManager {
    constructor() {
        this.credentials = new Map(); // Stores credentials in memory
    }

    async requestCredentials(domain) {
        console.log(`Requesting credentials for ${domain}`);
        const username = await input("Username: ");
        const password = await input("Password: ");
        this.credentials.set(domain, { username, password });
    }

    getCredentials(domain) {
        if (!this.credentials.has(domain)) {
            console.log("No credentials found for domain:", domain);
            return null;
        }
        return this.credentials.get(domain);
    }
}

module.exports = CredentialsManager;
