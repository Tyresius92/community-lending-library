import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("healthcheck", "routes/healthcheck/healthcheck.tsx"),
  route("join", "routes/join/join.tsx"),
  route("login", "routes/login/login.tsx"),
  route("magic_link", "routes/magic_link/magic_link.tsx"),
  route("logout", "routes/logout/logout.tsx"),
  route("communities", "routes/communities/communities.layout.tsx", [
    index("routes/communities/communities.tsx"),
    route("new", "routes/communities/new/new.tsx"),
    route(
      ":communitySlug",
      "routes/communities/$communitySlug/$communitySlug.layout.tsx",
      [
        index("routes/communities/$communitySlug/$communitySlug.tsx"),
        route(
          "items",
          "routes/communities/$communitySlug/items/items.layout.tsx",
          [
            index("routes/communities/$communitySlug/items/items.tsx"),
            route(
              ":itemId",
              "routes/communities/$communitySlug/items/$itemId/$itemId.tsx",
            ),
          ],
        ),
        route(
          "my_items",
          "routes/communities/$communitySlug/my_items/my_items.layout.tsx",
          [
            index("routes/communities/$communitySlug/my_items/my_items.tsx"),
            route(
              "new",
              "routes/communities/$communitySlug/my_items/new/new.tsx",
            ),
            route(
              ":itemId",
              "routes/communities/$communitySlug/my_items/$itemId/$itemId.layout.tsx",
              [
                index(
                  "routes/communities/$communitySlug/my_items/$itemId/$itemId.tsx",
                ),
                route(
                  "edit",
                  "routes/communities/$communitySlug/my_items/$itemId/edit/edit.tsx",
                ),
                route(
                  "delete",
                  "routes/communities/$communitySlug/my_items/$itemId/delete/delete.tsx",
                ),
              ],
            ),
          ],
        ),
        route(
          "members",
          "routes/communities/$communitySlug/members/members.layout.tsx",
          [
            index("routes/communities/$communitySlug/members/members.tsx"),
            route(
              ":membershipId",
              "routes/communities/$communitySlug/members/$membershipId/$membershipId.layout.tsx",
              [
                route(
                  "role",
                  "routes/communities/$communitySlug/members/$membershipId/role/role.tsx",
                ),
              ],
            ),
          ],
        ),
        route("loans", "routes/communities/$communitySlug/loans/loans.tsx"),
      ],
    ),
  ]),
] satisfies RouteConfig;
