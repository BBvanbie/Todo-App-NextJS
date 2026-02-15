ALTER TABLE "User" RENAME COLUMN "loginId" TO "email";
ALTER INDEX "User_loginId_key" RENAME TO "User_email_key";
