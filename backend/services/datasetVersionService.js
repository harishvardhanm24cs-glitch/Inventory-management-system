

import db from '../config/db.js';

export const datasetVersionService = {
  
  async getCurrentVersion() {
    try {
      const [versions] = await db.query(
        'SELECT version_tag FROM dataset_versions WHERE status = "ACTIVE" ORDER BY id DESC LIMIT 1'
      );

      if (versions.length > 0) {
        return versions[0].version_tag;
      }

      
      const now = new Date();
      const ym = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
      const defaultTag = `${ym}.001`;

      await db.query(
        'INSERT IGNORE INTO dataset_versions (version_tag, status) VALUES (?, "ACTIVE")',
        [defaultTag]
      );

      return defaultTag;
    } catch (error) {
      console.warn('[DatasetVersionService Warning]:', error.message);
      const now = new Date();
      return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.001`;
    }
  },

  
  async createNewVersion() {
    try {
      const now = new Date();
      const ym = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const [rows] = await db.query(
        'SELECT version_tag FROM dataset_versions WHERE version_tag LIKE ? ORDER BY id DESC LIMIT 1',
        [`${ym}.%`]
      );

      let seq = 1;
      if (rows.length > 0) {
        const parts = rows[0].version_tag.split('.');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
      }

      const newTag = `${ym}.${String(seq).padStart(3, '0')}`;

      
      await db.query('UPDATE dataset_versions SET status = "INACTIVE" WHERE status = "ACTIVE"');
      await db.query('INSERT INTO dataset_versions (version_tag, status) VALUES (?, "ACTIVE")', [newTag]);

      return newTag;
    } catch (error) {
      console.error('[DatasetVersionService Error]:', error.message);
      const now = new Date();
      return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.001`;
    }
  },

  
  async getVersionMetadata() {
    try {
      const [versions] = await db.query('SELECT * FROM dataset_versions ORDER BY id DESC');
      const currentVersion = versions.find(v => v.status === 'ACTIVE')?.version_tag || (versions[0]?.version_tag || '2026.07.001');

      return {
        current_version: currentVersion,
        total_versions: versions.length || 1,
        latest_version: versions[0]?.version_tag || currentVersion,
        versions_list: versions.map(v => ({
          version_tag: v.version_tag,
          status: v.status,
          total_records: v.total_records,
          created_at: v.created_at
        }))
      };
    } catch (error) {
      return {
        current_version: '2026.07.001',
        total_versions: 1,
        latest_version: '2026.07.001',
        versions_list: []
      };
    }
  }
};

export default datasetVersionService;
