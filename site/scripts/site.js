const toggle = document.querySelector(".nav-toggle");
const navigation = document.querySelector(".site-nav");

toggle?.addEventListener("click", () => {
  const open = navigation?.dataset.open !== "true";
  if (navigation) navigation.dataset.open = String(open);
  toggle.setAttribute("aria-expanded", String(open));
});

const page = document.body.dataset.page;
for (const link of document.querySelectorAll(".site-nav a[data-page]")) {
  if (link.dataset.page === page) link.setAttribute("aria-current", "page");
}
