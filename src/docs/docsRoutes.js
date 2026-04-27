export const DOC_NAV = [
  {
    title: "Start",
    items: [
      { path: "/docs", title: "Getting Started" }
    ]
  },
  {
    title: "Account",
    items: [
      { path: "/docs/account", title: "Account Overview" },
      { path: "/docs/account/create-account", title: "Create an Account" },
      { path: "/docs/account/change-password", title: "Change Password" },
      { path: "/docs/account/password-reset", title: "Password Reset" }
    ]
  },
  {
    title: "Guestbook",
    items: [
      { path: "/docs/guestbook", title: "Guestbook Features" },
      { path: "/docs/guestbook/embed", title: "Embed Guestbook" },
      { path: "/docs/guestbook/api", title: "Custom Guestbook API" },
      { path: "/docs/guestbook/settings", title: "Guestbook Settings" },
      { path: "/docs/guestbook/import-old-data", title: "Import Old Data" }
    ]
  },
  {
    title: "Contact Forms",
    items: [
      { path: "/docs/contact-forms", title: "Forms Overview" },
      { path: "/docs/contact-forms/builder", title: "Form Builder" },
      { path: "/docs/contact-forms/api-integration", title: "API Integration" },
      { path: "/docs/contact-forms/submissions", title: "Export and Delete Entries" }
    ]
  },
  {
    title: "Comments",
    items: [
      { path: "/docs/comments", title: "Comments Overview" },
      { path: "/docs/comments/sections", title: "Sections" },
      { path: "/docs/comments/integration", title: "Static Site Integration" },
      { path: "/docs/comments/moderation", title: "Moderation Tools" }
    ]
  },
  {
    title: "Likes",
    items: [
      { path: "/docs/likes", title: "Likes and Integration" }
    ]
  }
];

export const DOC_PATHS = DOC_NAV.flatMap((group) => group.items.map((item) => item.path));
