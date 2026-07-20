'use strict';

module.exports = {
  async up(queryInterface) {
    // Remove any duplicate chunks inserted before the ingestion upsert fix
    // (the old code had a check-then-act race with no DB-level guard), so
    // the unique index below can actually be created. Keeps the lowest id
    // per (source, source_id, chunk_index) group.
    await queryInterface.sequelize.query(`
      DELETE FROM knowledge_base a
      USING knowledge_base b
      WHERE a.id > b.id
        AND a.source = b.source
        AND a.source_id = b.source_id
        AND a.chunk_index = b.chunk_index;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX knowledge_base_source_source_id_chunk_index_uidx
      ON knowledge_base (source, source_id, chunk_index);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS knowledge_base_source_source_id_chunk_index_uidx;
    `);
  },
};
