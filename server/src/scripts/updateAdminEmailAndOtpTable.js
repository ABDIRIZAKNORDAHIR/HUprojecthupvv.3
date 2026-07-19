import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, getPool } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const TARGET = 'daacadnuur646@gmail.com';

async function main() {
  await getPool();

  await query(`
    CREATE TABLE IF NOT EXISTS EmailOtps (
      OtpId INT AUTO_INCREMENT PRIMARY KEY,
      Email VARCHAR(255) NOT NULL,
      Purpose VARCHAR(40) NOT NULL,
      CodeHash VARCHAR(255) NOT NULL,
      PayloadJson TEXT NULL,
      ExpiresAt DATETIME NOT NULL,
      Attempts INT NOT NULL DEFAULT 0,
      ConsumedAt DATETIME NULL,
      CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX IX_EmailOtps_EmailPurpose (Email, Purpose)
    )
  `);

  const holders = await query(
    `SELECT UserId, UniversityId, Email, Role FROM Users WHERE LOWER(Email) = @email OR Role = 'admin'`,
    { email: TARGET }
  );
  console.log('Before:', holders.recordset);

  // Free the email if another non-admin user has it
  await query(
    `UPDATE Users SET Email = CONCAT('moved+', UniversityId, '@hu.edu.placeholder')
     WHERE LOWER(Email) = @email AND Role <> 'admin'`,
    { email: TARGET }
  );

  await query(
    `UPDATE Users SET Email = @email WHERE Role = 'admin'`,
    { email: TARGET }
  );

  const after = await query(
    `SELECT UserId, UniversityId, Email, Role FROM Users WHERE Role = 'admin' OR LOWER(Email) = @email`,
    { email: TARGET }
  );
  console.log('After:', after.recordset);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
