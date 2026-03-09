import { google } from 'googleapis';

class GoogleDriveService {
    constructor(auth) {
        this.drive = google.drive({ version: 'v3', auth });
    }

    async findOrCreateFolder(name, parentId = null) {
        let query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        if (parentId) {
            query += ` and '${parentId}' in parents`;
        }

        const response = await this.drive.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (response.data.files.length > 0) {
            return response.data.files[0].id;
        }

        const fileMetadata = {
            name: name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentId ? [parentId] : undefined,
        };

        const folder = await this.drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });

        return folder.data.id;
    }

    async setupStructure() {
        // 1. Root folder
        const rootId = await this.findOrCreateFolder('Finanças-Pessoais');

        // 2. Faturas, Recibos, Relatórios
        const faturasId = await this.findOrCreateFolder('Faturas', rootId);
        await this.findOrCreateFolder('Recibos', rootId);
        await this.findOrCreateFolder('Relatórios', rootId);

        // 3. Year folder (current year)
        const currentYear = new Date().getFullYear().toString();
        const yearId = await this.findOrCreateFolder(currentYear, faturasId);

        // 4. Months (01 - 12)
        for (let i = 1; i <= 12; i++) {
            const month = i.toString().padStart(2, '0');
            await this.findOrCreateFolder(month, yearId);
        }

        return { rootId, faturasId, yearId };
    }
}

export default GoogleDriveService;
