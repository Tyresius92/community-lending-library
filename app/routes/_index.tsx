import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

import { useOptionalUser } from "~/utils";

export const meta: MetaFunction = () => [{ title: "Remix Notes" }];

export default function Index() {
  const user = useOptionalUser();
  return (
    <main>
      <div>
        {user ? (
          <Link to="/notes">View Notes for {user.email}</Link>
        ) : (
          <div>
            <Link to="/join">Sign up</Link>
            <Link to="/login">Log In</Link>
          </div>
        )}
      </div>
    </main>
  );
}
