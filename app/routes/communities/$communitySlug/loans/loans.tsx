import { redirect } from "react-router";

import type { Route } from "./+types/loans";

export const loader = ({ params }: Route.LoaderArgs) =>
  redirect(`/communities/${params.communitySlug}/loans/borrowing`);
