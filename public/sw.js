self.addEventListener("push", (event) => {
  let data = { title: "💊 Hora de la pastilla", body: "Toca para ver el detalle." };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // payload no era JSON, se usa el texto por defecto
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
      tag: "pastilla-recordatorio",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/paciente") && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/paciente");
      }
    })
  );
});
