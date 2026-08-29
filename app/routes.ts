import {
  index,
  prefix,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

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
        ...prefix("items", [
          index("routes/communities/$communitySlug/items/items.tsx"),
          route(
            ":itemId",
            "routes/communities/$communitySlug/items/$itemId/$itemId.tsx",
          ),
        ]),
        ...prefix("my_items", [
          index("routes/communities/$communitySlug/my_items/my_items.tsx"),
          route(
            "new",
            "routes/communities/$communitySlug/my_items/new/new.tsx",
          ),
          route(
            ":itemId",
            "routes/communities/$communitySlug/my_items/$itemId/$itemId.tsx",
          ),
          route(
            ":itemId/edit",
            "routes/communities/$communitySlug/my_items/$itemId/edit/edit.tsx",
          ),
          route(
            ":itemId/delete",
            "routes/communities/$communitySlug/my_items/$itemId/delete/delete.tsx",
          ),
        ]),
        ...prefix("members", [
          index("routes/communities/$communitySlug/members/members.tsx"),
          route(
            ":membershipId/role",
            "routes/communities/$communitySlug/members/$membershipId/role/role.tsx",
          ),
          route(
            ":membershipId/kick",
            "routes/communities/$communitySlug/members/$membershipId/kick/kick.tsx",
          ),
        ]),
        ...prefix("loans", [
          index("routes/communities/$communitySlug/loans/loans.tsx"),
          ...prefix("borrowing", [
            index(
              "routes/communities/$communitySlug/loans/borrowing/borrowing.tsx",
            ),
            route(
              ":loanId/cancel",
              "routes/communities/$communitySlug/loans/borrowing/$loanId/cancel/cancel.tsx",
            ),
          ]),
          ...prefix("lending", [
            index(
              "routes/communities/$communitySlug/loans/lending/lending.tsx",
            ),
            route(
              ":loanId/accept",
              "routes/communities/$communitySlug/loans/lending/$loanId/accept/accept.tsx",
            ),
            route(
              ":loanId/decline",
              "routes/communities/$communitySlug/loans/lending/$loanId/decline/decline.tsx",
            ),
            route(
              ":loanId/cancel",
              "routes/communities/$communitySlug/loans/lending/$loanId/cancel/cancel.tsx",
            ),
          ]),
        ]),
      ],
    ),
  ]),
] satisfies RouteConfig;
