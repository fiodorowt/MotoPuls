-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('ONLINE', 'ADMIN');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'VAN');

-- CreateEnum
CREATE TYPE "Refrigerant" AS ENUM ('R134A', 'R1234YF', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "InquiryType" AS ENUM ('PARTS', 'FLEET', 'CONTACT');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "totpSecretEnc" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpLastStep" INTEGER,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "twoFactorPassed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'wrench',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priceFrom" INTEGER,
    "priceTo" INTEGER,
    "durationMin" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "requiresRefrigerant" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetAccount" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "nip" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "marketingConsentAt" TIMESTAMP(3),
    "fleetAccountId" TEXT,
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "fleetAccountId" TEXT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "plate" TEXT NOT NULL,
    "vin" TEXT,
    "mileage" INTEGER,
    "type" "VehicleType" NOT NULL DEFAULT 'CAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "source" "BookingSource" NOT NULL DEFAULT 'ONLINE',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "bay" INTEGER NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "description" TEXT,
    "internalNote" TEXT,
    "refrigerant" "Refrigerant",
    "termsAcceptedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingService" (
    "bookingId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "priceFrom" INTEGER,
    "priceTo" INTEGER,

    CONSTRAINT "BookingService_pkey" PRIMARY KEY ("bookingId","serviceId")
);

-- CreateTable
CREATE TABLE "BookingSlot" (
    "id" TEXT NOT NULL,
    "bay" INTEGER NOT NULL,
    "slotStart" TIMESTAMP(3) NOT NULL,
    "bookingId" TEXT,
    "blockId" TEXT,

    CONSTRAINT "BookingSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "bay" INTEGER,
    "reason" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosedDay" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "ClosedDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningHours" (
    "weekday" INTEGER NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "open" TEXT NOT NULL DEFAULT '08:00',
    "close" TEXT NOT NULL DEFAULT '17:00',

    CONSTRAINT "OpeningHours_pkey" PRIMARY KEY ("weekday")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "brandName" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phones" TEXT[],
    "email" TEXT NOT NULL,
    "facebookUrl" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "directions" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "bays" INTEGER NOT NULL DEFAULT 2,
    "autoConfirm" BOOLEAN NOT NULL DEFAULT false,
    "cancelHoursBefore" INTEGER NOT NULL DEFAULT 24,
    "minLeadHours" INTEGER NOT NULL DEFAULT 12,
    "maxDaysAhead" INTEGER NOT NULL DEFAULT 60,
    "retentionMonths" INTEGER NOT NULL DEFAULT 36,
    "pricingNote" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBlock" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "type" "InquiryType" NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "RateLimit_windowStart_idx" ON "RateLimit"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Vehicle_plate_idx" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "Vehicle_customerId_idx" ON "Vehicle"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_token_key" ON "Booking"("token");

-- CreateIndex
CREATE INDEX "Booking_startsAt_idx" ON "Booking"("startsAt");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");

-- CreateIndex
CREATE INDEX "BookingSlot_bookingId_idx" ON "BookingSlot"("bookingId");

-- CreateIndex
CREATE INDEX "BookingSlot_blockId_idx" ON "BookingSlot"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingSlot_bay_slotStart_key" ON "BookingSlot"("bay", "slotStart");

-- CreateIndex
CREATE INDEX "Block_startsAt_idx" ON "Block"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClosedDay_date_key" ON "ClosedDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Media_filename_key" ON "Media"("filename");

-- CreateIndex
CREATE INDEX "Inquiry_type_status_idx" ON "Inquiry"("type", "status");

-- CreateIndex
CREATE INDEX "Inquiry_createdAt_idx" ON "Inquiry"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_fleetAccountId_fkey" FOREIGN KEY ("fleetAccountId") REFERENCES "FleetAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_fleetAccountId_fkey" FOREIGN KEY ("fleetAccountId") REFERENCES "FleetAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSlot" ADD CONSTRAINT "BookingSlot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSlot" ADD CONSTRAINT "BookingSlot_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;
