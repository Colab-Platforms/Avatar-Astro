import bcrypt from 'bcrypt';

export const hashPassword = async (password: string): Promise<string> => {
    // Cost 12 (~250ms) — the accepted floor for password storage. Existing cost-8 hashes keep
    // verifying (bcrypt reads the cost from the hash itself) and are upgraded on password change.
    return await bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
};