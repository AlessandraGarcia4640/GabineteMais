import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

// Resolve from this module, independently of the workspace command's working directory.
config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)), quiet: true });
