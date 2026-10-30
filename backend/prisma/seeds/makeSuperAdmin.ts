import prisma from "../../prisma.js";

/**
 * Grants the SUPERADMIN (main admin) role to ONE existing account.
 *
 *   Local / test database:
 *     npm run db:make-superadmin -- owner@example.com
 *
 *   Any other (remote) database, e.g. production Neon, needs an explicit confirmation that names the
 *   database host the script is about to change (the script prints the host it resolved):
 *     npm run db:make-superadmin -- owner@example.com --confirm-host=<database-host>
 *
 * Safety: the email is an argument (nothing is hard-coded), the account must already exist and be
 * active, nothing is created, and only one role mapping is added. Only the host name is ever printed,
 * never the connection string. This is a deliberate operator action with direct database access, which
 * is also the recovery path if the only main admin is ever locked out: there is no HTTP endpoint for it.
 */
function targetHost(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set; refusing to run.");
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    throw new Error("DATABASE_URL is not a valid URL; refusing to run.");
  }
}

const isLocalHost = (h: string) => h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
  const confirm = args.find((a) => a.startsWith("--confirm-host="))?.slice("--confirm-host=".length).toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("Usage: npm run db:make-superadmin -- <email> [--confirm-host=<database-host>]");
  }

  const host = targetHost();
  console.log(`Target database host: ${host}${isLocalHost(host) ? " (local)" : " (REMOTE)"}`);
  if (!isLocalHost(host) && confirm !== host) {
    throw new Error(
      `This is a remote database. To proceed deliberately, re-run with --confirm-host=${host} after backing up and confirming it is the intended environment.`,
    );
  }

  const user = await prisma.user.findFirst({ where: { email, isDeleted: false } });
  if (!user) throw new Error(`No account with email ${email}. Sign up first; this script never creates accounts.`);
  if (!user.isActive) throw new Error(`The account ${email} is deactivated. Reactivate it first.`);

  const role = await prisma.role.upsert({ where: { name: "SUPERADMIN" }, update: {}, create: { name: "SUPERADMIN" } });

  await prisma.userRoleMapping.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id, assignedBy: user.id },
  });

  console.log(`✓ ${email} is now the main admin (SUPERADMIN). Sign out and in again to refresh the session.`);
}

main()
  .catch((error) => {
    console.error("Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
