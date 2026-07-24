CREATE UNIQUE INDEX "Loan_one_active_per_item" ON "Loan"("itemId") WHERE "status" = 'active';

CREATE UNIQUE INDEX "CommunityMembership_one_owner_per_community" ON "CommunityMembership"("communityId") WHERE "role" = 'owner';
