import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Form } from "react-router";

import { Button } from "~/components/button/button";
import { Link } from "~/components/link/link";
import { Modal } from "~/components/modal/modal";
import { prisma } from "~/db.server";
import { getUserId, loginRedirect } from "~/session.server";
import { getCommunityMembership } from "~/utils/community_role.server";

import type { Route } from "./+types/$itemId";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData.item.name },
];

export const loader = async ({ params, request, url }: Route.LoaderArgs) => {
  const userId = await getUserId(request);
  if (!userId) {
    return loginRedirect(url);
  }

  const found = await getCommunityMembership(userId, params.communitySlug);
  if (!found) {
    throw new Response("Not Found", { status: 404 });
  }

  const item = await prisma.item.findFirst({
    where: {
      id: params.itemId,
      communityId: found.community.id,
      ownerMembershipId: found.membership.id,
    },
    select: { id: true, name: true, description: true },
  });
  if (!item) {
    throw new Response("Not Found", { status: 404 });
  }

  return { item };
};

export default function MyItemDetail({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { t } = useTranslation("items");
  const { item } = loaderData;
  const { communitySlug } = params;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  return (
    <div>
      <h1>{item.name}</h1>
      {item.description ? <p>{item.description}</p> : null}
      <Link to={`/communities/${communitySlug}/my_items/${item.id}/edit`}>
        {t("buttons.edit")}
      </Link>
      <Button
        variant="danger"
        onClick={() => {
          setIsDeleteModalOpen(true);
        }}
      >
        {t("buttons.delete")}
      </Button>
      <Modal
        isOpen={isDeleteModalOpen}
        setIsOpen={setIsDeleteModalOpen}
        title={t("notices.confirmDeleteTitle")}
        closeLabel={t("buttons.close")}
        content={
          <>
            <p>{t("notices.confirmDeleteBody")}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
              }}
            >
              {t("buttons.cancel")}
            </Button>
            <Form
              method="post"
              action={`/communities/${communitySlug}/my_items/${item.id}/delete`}
            >
              <Button type="submit" variant="danger">
                {t("buttons.confirmDelete")}
              </Button>
            </Form>
          </>
        }
      />
    </div>
  );
}
