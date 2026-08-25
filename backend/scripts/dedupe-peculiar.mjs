/**
 * @peculiar/asn1-schema keeps schemas in a module-level registry.
 * Bun often nests a separate copy under each @peculiar/* package even at the
 * same version, which breaks SimpleWebAuthn/x509 with:
 *   Cannot get schema for 'AlgorithmIdentifier' target
 * Remove nested copies so everything resolves to the single hoisted package.
 */
import { readdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const peculiarRoot = join(process.cwd(), 'node_modules', '@peculiar');
if (!existsSync(peculiarRoot)) process.exit(0);

let removed = 0;
for (const name of readdirSync(peculiarRoot)) {
    const nested = join(peculiarRoot, name, 'node_modules', '@peculiar', 'asn1-schema');
    if (existsSync(nested)) {
        rmSync(nested, { recursive: true, force: true });
        removed++;
    }
}
if (removed > 0) {
    console.log(`[dedupe-peculiar] removed ${removed} nested @peculiar/asn1-schema copy(ies)`);
}
