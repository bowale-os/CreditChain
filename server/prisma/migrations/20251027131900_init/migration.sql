-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "body" TEXT,
    "category" TEXT NOT NULL,
    "hashedId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "onChainIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);
