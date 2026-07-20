import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

interface KnowledgeBaseAttributes {
  id: number;
  source: string;
  source_id: string;
  chunk_index: number;
  chunk_content: string;
  embeddings_768?: number[] | null;
  embeddings_1536?: number[] | null;
  created_at?: Date;
  updated_at?: Date;
}

interface KnowledgeBaseCreationAttributes
  extends Optional<
    KnowledgeBaseAttributes,
    'id' | 'created_at' | 'updated_at'
  > {}

class KnowledgeBase
  extends Model<KnowledgeBaseAttributes, KnowledgeBaseCreationAttributes>
  implements KnowledgeBaseAttributes
{
  public id!: number;
  public source!: string;
  public source_id!: string;
  public chunk_index!: number;
  public chunk_content!: string;
  public embeddings_768?: number[] | null;
  public embeddings_1536?: number[] | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

KnowledgeBase.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    source: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    source_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    chunk_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    chunk_content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // NOTE: the real Postgres column type is native pgvector `vector(768)` /
    // `vector(1536)` (see migrations/20250927100126-create-embeddings-table),
    // not an array. DataTypes.ARRAY(REAL) here is a placeholder that only
    // exists so Sequelize's model layer knows the column names for INSERT
    // purposes. Every actual read and write of these columns deliberately
    // bypasses this declared type via raw SQL / parameterized `CAST(... AS
    // vector)` (see ingestionService.ts and retrievalService.ts) — pgvector's
    // textual output (`[0.1,0.2,...]`) doesn't match what ARRAY(REAL) expects
    // (`{0.1,0.2,...}`), so calling `.findAll()`/`.findOne()` on this model
    // and expecting a normal JS array back would break. Don't "fix" this by
    // removing the raw-SQL bypass without also introducing a real pgvector
    // Sequelize type.
    embeddings_768: {
      type: DataTypes.ARRAY(DataTypes.REAL),
      allowNull: true,
    },
    embeddings_1536: {
      type: DataTypes.ARRAY(DataTypes.REAL),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'knowledge_base',
    timestamps: true,
    underscored: true,
  }
);

export default KnowledgeBase;
