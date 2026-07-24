import type { MetaFunction } from "react-router";
import { Link } from "react-router";

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
            <Link to="/login">Log in</Link>
          </div>
        )}
      </div>
    </main>
  );
}
