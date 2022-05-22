// SPDX-FileCopyrightText: 2021 M. Shulhan <ms@kilabit.info>
// SPDX-License-Identifier: GPL-3.0-or-later

function notifError(msg) {
  displayNotif("error", msg);
}

function notifInfo(msg) {
  displayNotif("info", msg);
}

function displayNotif(className, msg) {
  let notif = document.getElementById("notif");
  let el = document.createElement("div");
  el.classList.add(className);
  el.innerHTML = msg;
  notif.appendChild(el);

  setTimeout(function () {
    notif.removeChild(notif.children[0]);
  }, 5000);
}

function toggleInfo(id) {
  let el = document.getElementById(id);
  if (el.style.display === "none") {
    el.style.display = "block";
  } else {
    el.style.display = "none";
  }
}
