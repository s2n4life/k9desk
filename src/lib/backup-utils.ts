import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Initialize R2 client (S3-compatible)
const getR2Client = () => {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
        throw new Error('Missing R2 credentials in environment variables');
    }

    return new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });
};

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'k9desk-backups';

/**
 * Export database using Supabase service role
 * Returns SQL dump as a string
 */
export async function exportDatabase(): Promise<string> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all table names
    const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .neq('table_name', 'schema_migrations');

    if (tablesError) {
        throw new Error(`Failed to fetch tables: ${tablesError.message}`);
    }

    let sqlDump = `-- K9Desk Database Backup\n`;
    sqlDump += `-- Generated: ${new Date().toISOString()}\n`;
    sqlDump += `-- Database: ${supabaseUrl}\n\n`;

    // Export each table
    for (const table of tables || []) {
        const tableName = table.table_name;

        // Get table schema
        const { data: columns, error: columnsError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_schema', 'public')
            .eq('table_name', tableName)
            .order('ordinal_position');

        if (columnsError) {
            console.warn(`Failed to fetch schema for ${tableName}:`, columnsError);
            continue;
        }

        // Get table data
        const { data: rows, error: rowsError } = await supabase
            .from(tableName)
            .select('*');

        if (rowsError) {
            console.warn(`Failed to fetch data for ${tableName}:`, rowsError);
            continue;
        }

        sqlDump += `\n-- Table: ${tableName}\n`;
        sqlDump += `-- Rows: ${rows?.length || 0}\n`;

        if (rows && rows.length > 0) {
            const columnNames = columns?.map(c => c.column_name) || [];

            for (const row of rows) {
                const values = columnNames.map(col => {
                    const val = row[col];
                    if (val === null) return 'NULL';
                    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                    return val;
                });

                sqlDump += `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')});\n`;
            }
        }
    }

    return sqlDump;
}

/**
 * Upload backup to R2 storage
 */
export async function uploadToR2(
    content: string,
    filename: string,
    metadata?: Record<string, string>
): Promise<{ success: boolean; url: string; size: number; checksum: string }> {
    const r2 = getR2Client();
    const buffer = Buffer.from(content, 'utf-8');
    const checksum = createHash('sha256').update(buffer).digest('hex');

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
        Body: buffer,
        ContentType: 'application/sql',
        Metadata: {
            ...metadata,
            checksum,
            timestamp: new Date().toISOString(),
        },
    });

    await r2.send(command);

    return {
        success: true,
        url: `r2://${BUCKET_NAME}/${filename}`,
        size: buffer.length,
        checksum,
    };
}

/**
 * Download backup from R2 storage
 */
export async function downloadFromR2(filename: string): Promise<{ content: string; metadata: Record<string, string> }> {
    const r2 = getR2Client();

    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
    });

    const response = await r2.send(command);
    const content = await response.Body?.transformToString() || '';

    return {
        content,
        metadata: response.Metadata || {},
    };
}

/**
 * List all backups from R2 storage
 */
export async function listBackups(): Promise<Array<{
    filename: string;
    size: number;
    lastModified: Date;
    type: 'daily' | 'weekly' | 'manual';
}>> {
    const r2 = getR2Client();

    const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
    });

    const response = await r2.send(command);
    const objects = response.Contents || [];

    return objects.map(obj => {
        const filename = obj.Key || '';
        let type: 'daily' | 'weekly' | 'manual' = 'daily';

        if (filename.startsWith('manual-')) {
            type = 'manual';
        } else if (filename.includes('-weekly-')) {
            type = 'weekly';
        }

        return {
            filename,
            size: obj.Size || 0,
            lastModified: obj.LastModified || new Date(),
            type,
        };
    }).sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

/**
 * Delete old backups based on retention policy
 * Keep: 7 daily backups + 4 weekly backups + all manual backups
 */
export async function cleanupOldBackups(): Promise<{ deleted: number; kept: number }> {
    const backups = await listBackups();
    const r2 = getR2Client();

    const dailyBackups = backups.filter(b => b.type === 'daily');
    const weeklyBackups = backups.filter(b => b.type === 'weekly');
    const manualBackups = backups.filter(b => b.type === 'manual');

    const toDelete: string[] = [];

    // Keep last 7 daily backups
    if (dailyBackups.length > 7) {
        toDelete.push(...dailyBackups.slice(7).map(b => b.filename));
    }

    // Keep last 4 weekly backups
    if (weeklyBackups.length > 4) {
        toDelete.push(...weeklyBackups.slice(4).map(b => b.filename));
    }

    // Never delete manual backups

    // Delete old backups
    for (const filename of toDelete) {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: filename,
        });
        await r2.send(command);
    }

    return {
        deleted: toDelete.length,
        kept: backups.length - toDelete.length,
    };
}

/**
 * Verify backup integrity
 */
export async function verifyBackup(filename: string): Promise<{ valid: boolean; error?: string }> {
    try {
        const { content, metadata } = await downloadFromR2(filename);

        // Check if content is valid SQL
        if (!content.includes('INSERT INTO') && !content.includes('CREATE TABLE')) {
            return { valid: false, error: 'Backup does not contain valid SQL statements' };
        }

        // Verify checksum if available
        if (metadata.checksum) {
            const actualChecksum = createHash('sha256').update(content).digest('hex');
            if (actualChecksum !== metadata.checksum) {
                return { valid: false, error: 'Checksum mismatch - backup may be corrupted' };
            }
        }

        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
