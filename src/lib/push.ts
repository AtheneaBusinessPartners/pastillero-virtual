import webpush from "web-push";

let configured = false;

export function getWebPush() {
  if (!configured) {
    webpush.setVapidDetails(
      "mailto:soporte@mis-pastillas.app",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    configured = true;
  }
  return webpush;
}
