import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_POOLER_URL,
});
const prisma = new PrismaClient({ adapter });

async function seed() {
  const email = "rachel@remix.run";

  const communitySlug = "riverside-tool-share";

  const existingCommunity = await prisma.community.findUnique({
    where: { slug: communitySlug },
  });

  if (existingCommunity) {
    await prisma.communityMembership.deleteMany({
      where: { communityId: existingCommunity.id },
    });
    await prisma.community.delete({ where: { id: existingCommunity.id } });
  }

  // cleanup the existing database
  await prisma.user.delete({ where: { email } }).catch(() => {
    // no worries if it doesn't exist yet
  });

  const user = await prisma.user.create({ data: { email } });

  await prisma.note.create({
    data: {
      title: "My first note",
      body: "Hello, world!",
      userId: user.id,
    },
  });

  await prisma.note.create({
    data: {
      title: "My second note",
      body: "Hello, world!",
      userId: user.id,
    },
  });

  const borrowerEmail = "bob@example.com";

  await prisma.user.delete({ where: { email: borrowerEmail } }).catch(() => {
    // no worries if it doesn't exist yet
  });

  const borrower = await prisma.user.create({ data: { email: borrowerEmail } });

  const community = await prisma.community.create({
    data: {
      name: "Riverside Tool Share",
      slug: communitySlug,
      description: "A neighborhood tool and equipment lending group.",
      visibility: "private",
      joinPolicy: "invite_only",
      ownerId: user.id,
    },
  });

  const ownerMembership = await prisma.communityMembership.create({
    data: {
      userId: user.id,
      communityId: community.id,
      role: "owner",
      displayName: "Rachel",
    },
  });

  await prisma.communityMembership.create({
    data: {
      userId: borrower.id,
      communityId: community.id,
      role: "member",
      displayName: "Bob",
    },
  });

  const drill = await prisma.item.create({
    data: {
      name: "Cordless Power Drill",
      description: "18V drill with two batteries and a charger.",
      ownerMembershipId: ownerMembership.id,
      communityId: community.id,
    },
  });

  await prisma.item.create({
    data: {
      name: "Extension Ladder",
      description: "24ft aluminum extension ladder.",
      ownerMembershipId: ownerMembership.id,
      communityId: community.id,
    },
  });

  await prisma.loan.create({
    data: {
      itemId: drill.id,
      communityId: community.id,
      borrowerId: borrower.id,
      ownerId: user.id,
      status: "pending",
      requestedDurationDays: 3,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
