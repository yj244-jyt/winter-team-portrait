"use strict";
const pageUrl = new URL(location.href);
const roomParam = pageUrl.searchParams.get("room");
const role = pageUrl.searchParams.get("role");
// A room in the URL is always an invitation. Host ownership stays on its original browser.
const host = roomParam === null && (role === "host" || role === null);
const validCode = code => /^(?:[a-f0-9]{10}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i.test(code || "");
const newCode = () => crypto.randomUUID().replaceAll("-", "").slice(0,10);
document.getElementById("roleLabel").textContent = host ? "Residence Life · Host" : "Residence Life · Player";
if (host || validCode(roomParam)) {
  const script = document.createElement("script");
  script.src = "app.js?v=5";
  document.body.append(script);
} else {
  document.getElementById("join").hidden = false;
  document.getElementById("network").textContent = "Player entrance";
  document.getElementById("joinForm").onsubmit = event => {
    event.preventDefault();
    const code = document.getElementById("joinCode").value.trim().toLowerCase();
    if (!validCode(code)) {
      document.getElementById("notice").textContent = "Enter the room code shown by your host.";
      return;
    }
    pageUrl.search = new URLSearchParams({role:"player", room:code});
    location.assign(pageUrl.href);
  };
}
